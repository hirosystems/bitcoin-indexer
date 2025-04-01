use bitcoind::{try_debug, try_info, try_warn, utils::Context};
use hyper::{
    header::CONTENT_TYPE,
    service::{make_service_fn, service_fn},
    Body, Method, Request, Response, Server,
};
use prometheus::{
    core::{AtomicF64, AtomicU64, GenericCounter, GenericGauge},
    Encoder, Histogram, HistogramOpts, Registry, TextEncoder,
};

type UInt64Gauge = GenericGauge<AtomicU64>;
type F64Gauge = GenericGauge<AtomicF64>;
type U64Counter = GenericCounter<AtomicU64>;

#[derive(Debug, Clone)]
pub struct PrometheusMonitoring {
    // Existing metrics
    pub last_indexed_block_height: UInt64Gauge,
    pub last_indexed_inscription_number: UInt64Gauge,
    pub registered_predicates: UInt64Gauge,

    // Performance metrics
    pub block_processing_time: Histogram,
    pub inscription_parsing_time: Histogram,
    pub ordinal_computation_time: Histogram,
    pub db_write_time: Histogram,

    // Volumetric metrics
    pub inscriptions_per_block: Histogram,
    pub brc20_operations_per_block: Histogram,

    // Health metrics
    pub chain_tip_distance: UInt64Gauge,
    pub processing_errors: U64Counter,

    // BRC-20 specific metrics
    pub brc20_deploy_operations: U64Counter,
    pub brc20_mint_operations: U64Counter,
    pub brc20_transfer_operations: U64Counter,
    pub brc20_transfer_send_operations: U64Counter,

    // Resource metrics
    pub cache_size: UInt64Gauge,
    pub memory_usage: F64Gauge,

    // Registry
    pub registry: Registry,
}

impl Default for PrometheusMonitoring {
    fn default() -> Self {
        Self::new()
    }
}

impl PrometheusMonitoring {
    pub fn new() -> PrometheusMonitoring {
        let registry = Registry::new();

        // Existing metrics
        let last_indexed_block_height = Self::create_and_register_uint64_gauge(
            &registry,
            "last_indexed_block_height",
            "The latest Bitcoin block indexed for ordinals.",
        );
        let last_indexed_inscription_number = Self::create_and_register_uint64_gauge(
            &registry,
            "last_indexed_inscription_number",
            "The latest indexed inscription number.",
        );
        let registered_predicates = Self::create_and_register_uint64_gauge(
            &registry,
            "registered_predicates",
            "The current number of predicates registered to receive ordinal events.",
        );

        // Performance metrics
        let block_processing_time = Self::create_and_register_histogram(
            &registry,
            "block_processing_time",
            "Time taken to process a block in milliseconds",
            vec![
                10.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0, 10000.0,
            ],
        );
        let inscription_parsing_time = Self::create_and_register_histogram(
            &registry,
            "inscription_parsing_time",
            "Time taken to parse inscriptions in a block in milliseconds",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );
        let ordinal_computation_time = Self::create_and_register_histogram(
            &registry,
            "ordinal_computation_time",
            "Time taken to compute ordinals in milliseconds",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );
        let db_write_time = Self::create_and_register_histogram(
            &registry,
            "db_write_time",
            "Time taken to write to the database in milliseconds",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );

        // Volumetric metrics
        let inscriptions_per_block = Self::create_and_register_histogram(
            &registry,
            "inscriptions_per_block",
            "Number of inscriptions per block",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );
        let brc20_operations_per_block = Self::create_and_register_histogram(
            &registry,
            "brc20_operations_per_block",
            "Number of BRC-20 operations per block",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0],
        );

        // Health metrics
        let chain_tip_distance = Self::create_and_register_uint64_gauge(
            &registry,
            "chain_tip_distance",
            "Distance in blocks from the Bitcoin chain tip",
        );
        let processing_errors = Self::create_and_register_counter(
            &registry,
            "processing_errors",
            "Count of processing errors encountered",
        );
        let rollback_operations = Self::create_and_register_counter(
            &registry,
            "rollback_operations",
            "Count of block rollback operations performed",
        );

        // BRC-20 specific metrics
        let brc20_deploy_operations = Self::create_and_register_counter(
            &registry,
            "brc20_deploy_operations",
            "Count of BRC-20 deploy operations processed",
        );
        let brc20_mint_operations = Self::create_and_register_counter(
            &registry,
            "brc20_mint_operations",
            "Count of BRC-20 mint operations processed",
        );
        let brc20_transfer_operations = Self::create_and_register_counter(
            &registry,
            "brc20_transfer_operations",
            "Count of BRC-20 transfer operations processed",
        );
        let brc20_transfer_send_operations = Self::create_and_register_counter(
            &registry,
            "brc20_transfer_send_operations",
            "Count of BRC-20 transfer send operations processed",
        );

        // Resource metrics
        let cache_size = Self::create_and_register_uint64_gauge(
            &registry,
            "cache_size",
            "Current size of the cache in entries",
        );
        let memory_usage = Self::create_and_register_f64_gauge(
            &registry,
            "memory_usage_mb",
            "Estimated memory usage in MB",
        );

        PrometheusMonitoring {
            last_indexed_block_height,
            last_indexed_inscription_number,
            registered_predicates,
            block_processing_time,
            inscription_parsing_time,
            ordinal_computation_time,
            db_write_time,
            inscriptions_per_block,
            brc20_operations_per_block,
            chain_tip_distance,
            processing_errors,
            brc20_deploy_operations,
            brc20_mint_operations,
            brc20_transfer_operations,
            brc20_transfer_send_operations,
            cache_size,
            memory_usage,
            registry,
        }
    }

    pub fn create_and_register_uint64_gauge(
        registry: &Registry,
        name: &str,
        help: &str,
    ) -> UInt64Gauge {
        let g = UInt64Gauge::new(name, help).unwrap();
        registry.register(Box::new(g.clone())).unwrap();
        g
    }

    pub fn create_and_register_f64_gauge(registry: &Registry, name: &str, help: &str) -> F64Gauge {
        let g = F64Gauge::new(name, help).unwrap();
        registry.register(Box::new(g.clone())).unwrap();
        g
    }

    pub fn create_and_register_counter(registry: &Registry, name: &str, help: &str) -> U64Counter {
        let c = U64Counter::new(name, help).unwrap();
        registry.register(Box::new(c.clone())).unwrap();
        c
    }

    pub fn create_and_register_histogram(
        registry: &Registry,
        name: &str,
        help: &str,
        buckets: Vec<f64>,
    ) -> Histogram {
        let h = Histogram::with_opts(HistogramOpts::new(name, help).buckets(buckets)).unwrap();
        registry.register(Box::new(h.clone())).unwrap();
        h
    }

    pub fn initialize(
        &self,
        total_predicates: u64,
        max_inscription_number: u64,
        block_height: u64,
    ) {
        self.metrics_set_registered_predicates(total_predicates);
        self.metrics_block_indexed(block_height);
        self.metrics_inscription_indexed(max_inscription_number);
    }

    // Existing metrics methods
    pub fn metrics_deregister_predicate(&self) {
        self.registered_predicates.dec();
    }

    pub fn metrics_register_predicate(&self) {
        self.registered_predicates.inc();
    }

    pub fn metrics_set_registered_predicates(&self, registered_predicates: u64) {
        self.registered_predicates.set(registered_predicates);
    }

    pub fn metrics_inscription_indexed(&self, inscription_number: u64) {
        let highest_appended = self.last_indexed_inscription_number.get();
        if inscription_number > highest_appended {
            self.last_indexed_inscription_number.set(inscription_number);
        }
    }

    pub fn metrics_block_indexed(&self, block_height: u64) {
        let highest_appended = self.last_indexed_block_height.get();
        if block_height > highest_appended {
            self.last_indexed_block_height.set(block_height);
        }
    }

    // Health metrics methods
    pub fn metrics_update_chain_tip_distance(&self, distance: u64) {
        self.chain_tip_distance.set(distance);
    }

    pub fn metrics_record_processing_error(&self) {
        self.processing_errors.inc();
    }

    // Performance metrics methods
    pub fn metrics_record_block_processing_time(&self, process_time: f64) {
        self.block_processing_time.observe(process_time);
    }

    pub fn metrics_record_inscription_parsing_time(&self, elapsed_ms: f64) {
        self.inscription_parsing_time.observe(elapsed_ms);
    }

    pub fn metrics_record_ordinal_computation_time(&self, elapsed_ms: f64) {
        self.ordinal_computation_time.observe(elapsed_ms);
    }

    pub fn metrics_record_db_write_time(&self, elapsed_ms: f64) {
        self.db_write_time.observe(elapsed_ms);
    }

    // Volumetric metrics methods
    pub fn metrics_record_inscriptions_in_block(&self, count: u64) {
        self.inscriptions_per_block.observe(count as f64);
    }

    pub fn metrics_record_brc20_operations_in_block(&self, count: u64) {
        self.brc20_operations_per_block.observe(count as f64);
    }

    // BRC-20 specific metrics methods
    pub fn metrics_record_brc20_deploy(&self) {
        self.brc20_deploy_operations.inc();
    }

    pub fn metrics_record_brc20_mint(&self) {
        self.brc20_mint_operations.inc();
    }

    pub fn metrics_record_brc20_transfer(&self) {
        self.brc20_transfer_operations.inc();
    }

    pub fn metrics_record_brc20_transfer_send(&self) {
        self.brc20_transfer_send_operations.inc();
    }

    // Resource metrics methods
    pub fn metrics_update_cache_size(&self, size: u64) {
        self.cache_size.set(size);
    }

    pub fn metrics_update_memory_usage(&self, mb: f64) {
        self.memory_usage.set(mb);
    }
}

async fn serve_req(
    req: Request<Body>,
    registry: Registry,
    ctx: Context,
) -> Result<Response<Body>, hyper::Error> {
    match (req.method(), req.uri().path()) {
        (&Method::GET, "/metrics") => {
            try_debug!(ctx, "Prometheus monitoring: responding to metrics request");

            let encoder = TextEncoder::new();
            let metric_families = registry.gather();
            let mut buffer = vec![];
            let response = match encoder.encode(&metric_families, &mut buffer) {
                Ok(_) => Response::builder()
                    .status(200)
                    .header(CONTENT_TYPE, encoder.format_type())
                    .body(Body::from(buffer))
                    .unwrap(),
                Err(e) => {
                    try_debug!(
                        ctx,
                        "Prometheus monitoring: failed to encode metrics: {}",
                        e.to_string()
                    );
                    Response::builder().status(500).body(Body::empty()).unwrap()
                }
            };
            Ok(response)
        }
        (_, _) => {
            try_debug!(
                ctx,
                "Prometheus monitoring: received request with invalid method/route: {}/{}",
                req.method(),
                req.uri().path()
            );
            let response = Response::builder().status(404).body(Body::empty()).unwrap();

            Ok(response)
        }
    }
}

pub async fn start_serving_prometheus_metrics(port: u16, registry: Registry, ctx: Context) {
    let addr = ([0, 0, 0, 0], port).into();
    let ctx_clone = ctx.clone();
    let make_svc = make_service_fn(|_| {
        let registry = registry.clone();
        let ctx_clone = ctx_clone.clone();
        async move {
            Ok::<_, hyper::Error>(service_fn(move |r| {
                serve_req(r, registry.clone(), ctx_clone.clone())
            }))
        }
    });
    let serve_future = Server::bind(&addr).serve(make_svc);
    try_info!(ctx, "Prometheus monitoring: listening on port {}", port);
    if let Err(err) = serve_future.await {
        try_warn!(ctx, "Prometheus monitoring: server error: {}", err);
    }
}

#[cfg(test)]
mod tests {
    use std::time::Instant;

    use prometheus::core::Collector;

    use super::*;

    fn verify_metric_exists(metrics: &[prometheus::proto::MetricFamily], name: &str) -> bool {
        metrics.iter().any(|m| m.get_name() == name)
    }

    #[test]
    fn test_block_processing_time() {
        let monitoring = PrometheusMonitoring::new();
        let start_time = Instant::now();

        // Simulate some processing time with a more reliable method
        std::thread::sleep(std::time::Duration::from_millis(100));

        monitoring.metrics_record_block_processing_time(start_time.elapsed().as_millis() as f64);

        // Get the histogram values directly
        let mut mfs = monitoring.block_processing_time.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let proto_histogram = m.get_histogram();

        // Verify we recorded exactly 1 observation
        assert_eq!(
            proto_histogram.get_sample_count(),
            1,
            "Should have recorded 1 observation"
        );

        // Verify the observation value is within reasonable bounds
        let actual_time = proto_histogram.get_sample_sum();
        assert!(
            actual_time >= 95.0 && actual_time <= 105.0,
            "Observation should be within reasonable bounds (95-105ms)"
        );
    }

    #[test]
    fn test_inscription_parsing_time() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different parsing times
        monitoring.metrics_record_inscription_parsing_time(50.0);
        monitoring.metrics_record_inscription_parsing_time(150.0);

        // Get the histogram values directly
        let mut mfs = monitoring.inscription_parsing_time.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let proto_histogram = m.get_histogram();

        // Verify we recorded exactly 2 observations
        assert_eq!(
            proto_histogram.get_sample_count(),
            2,
            "Should have recorded 2 observations"
        );

        // Verify the sum of our observations (50 + 150 = 200)
        assert_eq!(
            proto_histogram.get_sample_sum(),
            200.0,
            "Sum of observations should be 200.0"
        );
    }

    #[test]
    fn test_ordinal_computation_time() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different computation times
        monitoring.metrics_record_ordinal_computation_time(75.0);
        monitoring.metrics_record_ordinal_computation_time(200.0);

        // Get the histogram values directly
        let mut mfs = monitoring.ordinal_computation_time.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let proto_histogram = m.get_histogram();

        // Verify we recorded exactly 2 observations
        assert_eq!(
            proto_histogram.get_sample_count(),
            2,
            "Should have recorded 2 observations"
        );

        // Verify the sum of our observations (75 + 200 = 275)
        assert_eq!(
            proto_histogram.get_sample_sum(),
            275.0,
            "Sum of observations should be 275.0"
        );
    }

    #[test]
    fn test_db_write_time() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different write times
        monitoring.metrics_record_db_write_time(25.0);
        monitoring.metrics_record_db_write_time(100.0);

        // Get the histogram values directly
        let mut mfs = monitoring.db_write_time.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let proto_histogram = m.get_histogram();

        // Verify we recorded exactly 2 observations
        assert_eq!(
            proto_histogram.get_sample_count(),
            2,
            "Should have recorded 2 observations"
        );

        // Verify the sum of our observations (25 + 100 = 125)
        assert_eq!(
            proto_histogram.get_sample_sum(),
            125.0,
            "Sum of observations should be 125.0"
        );
    }

    #[test]
    fn test_inscriptions_per_block() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different inscription counts
        monitoring.metrics_record_inscriptions_in_block(5);
        monitoring.metrics_record_inscriptions_in_block(10);

        // Get the histogram values directly
        let mut mfs = monitoring.inscriptions_per_block.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let proto_histogram = m.get_histogram();

        // Verify we recorded exactly 2 observations
        assert_eq!(
            proto_histogram.get_sample_count(),
            2,
            "Should have recorded 2 observations"
        );

        // Verify the sum of our observations (5 + 10 = 15)
        assert_eq!(
            proto_histogram.get_sample_sum(),
            15.0,
            "Sum of observations should be 15.0"
        );

        // Verify the values were properly bucketed
        let buckets = proto_histogram.get_bucket();
        assert!(!buckets.is_empty(), "Should have bucket data");

        // The value 5 should be in the 5-10 bucket
        let bucket_5 = buckets
            .iter()
            .find(|b| b.get_upper_bound() == 5.0)
            .expect("Should have 5 bucket");
        assert_eq!(
            bucket_5.get_cumulative_count(),
            1,
            "First value (5) should be in 5-10 bucket"
        );

        // The value 10 should be in the 10-25 bucket
        let bucket_10 = buckets
            .iter()
            .find(|b| b.get_upper_bound() == 10.0)
            .expect("Should have 10 bucket");
        assert_eq!(
            bucket_10.get_cumulative_count(),
            2,
            "Second value (10) should be in 10-25 bucket"
        );
    }

    #[test]
    fn test_brc20_operations_per_block() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different BRC-20 operation counts
        monitoring.metrics_record_brc20_operations_in_block(3);
        monitoring.metrics_record_brc20_operations_in_block(7);

        // Get the histogram values directly
        let mut mfs = monitoring.brc20_operations_per_block.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let proto_histogram = m.get_histogram();

        // Verify we recorded exactly 2 observations
        assert_eq!(
            proto_histogram.get_sample_count(),
            2,
            "Should have recorded 2 observations"
        );

        // Verify the sum of our observations (3 + 7 = 10)
        assert_eq!(
            proto_histogram.get_sample_sum(),
            10.0,
            "Sum of observations should be 10.0"
        );
    }

    #[test]
    fn test_metric_buckets() {
        let monitoring = PrometheusMonitoring::new();

        // Test that metrics are properly bucketed
        let test_values = vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0];

        for value in test_values {
            monitoring.metrics_record_inscription_parsing_time(value);
            monitoring.metrics_record_ordinal_computation_time(value);
            monitoring.metrics_record_db_write_time(value);
        }

        // Verify metrics were recorded
        let metrics = monitoring.registry.gather();
        assert!(verify_metric_exists(&metrics, "inscription_parsing_time"));
        assert!(verify_metric_exists(&metrics, "ordinal_computation_time"));
        assert!(verify_metric_exists(&metrics, "db_write_time"));
    }

    #[test]
    fn test_metric_registry() {
        let monitoring = PrometheusMonitoring::new();

        // Record some test metrics
        monitoring.metrics_record_inscription_parsing_time(50.0);
        monitoring.metrics_record_ordinal_computation_time(75.0);
        monitoring.metrics_record_db_write_time(25.0);

        // Verify registry contains the metrics
        let metrics = monitoring.registry.gather();

        // Verify all expected metrics exist
        assert!(verify_metric_exists(&metrics, "inscription_parsing_time"));
        assert!(verify_metric_exists(&metrics, "ordinal_computation_time"));
        assert!(verify_metric_exists(&metrics, "db_write_time"));
    }

    #[test]
    fn test_processing_errors() {
        let monitoring = PrometheusMonitoring::new();

        // Record some processing errors
        monitoring.metrics_record_processing_error();
        monitoring.metrics_record_processing_error();
        monitoring.metrics_record_processing_error();

        // Get the counter value
        let mut mfs = monitoring.processing_errors.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();

        // Verify we recorded exactly 3 processing errors
        assert_eq!(
            counter.get_value(),
            3.0,
            "Should have recorded 3 processing errors"
        );
    }

    #[test]
    fn test_chain_tip_distance() {
        let monitoring = PrometheusMonitoring::new();

        // Update chain tip distance
        monitoring.metrics_update_chain_tip_distance(5);
        monitoring.metrics_update_chain_tip_distance(10);

        // Get the gauge value
        let mut mfs = monitoring.chain_tip_distance.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let gauge = m.get_gauge();

        // Verify the final value is 10
        assert_eq!(gauge.get_value(), 10.0, "Chain tip distance should be 10");
    }

    #[test]
    fn test_cache_size() {
        let monitoring = PrometheusMonitoring::new();

        // Update cache size
        monitoring.metrics_update_cache_size(100);
        monitoring.metrics_update_cache_size(200);

        // Get the gauge value
        let mut mfs = monitoring.cache_size.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let gauge = m.get_gauge();

        // Verify the final value is 200
        assert_eq!(gauge.get_value(), 200.0, "Cache size should be 200");
    }

    #[test]
    fn test_memory_usage() {
        let monitoring = PrometheusMonitoring::new();

        // Update memory usage
        monitoring.metrics_update_memory_usage(100.5);
        monitoring.metrics_update_memory_usage(200.75);

        // Get the gauge value
        let mut mfs = monitoring.memory_usage.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let gauge = m.get_gauge();

        // Verify the final value is 200.75
        assert_eq!(
            gauge.get_value(),
            200.75,
            "Memory usage should be 200.75 MB"
        );
    }

    #[test]
    fn test_brc20_operations() {
        let monitoring = PrometheusMonitoring::new();

        // Record different types of BRC-20 operations
        monitoring.metrics_record_brc20_deploy();
        monitoring.metrics_record_brc20_deploy();
        monitoring.metrics_record_brc20_mint();
        monitoring.metrics_record_brc20_mint();
        monitoring.metrics_record_brc20_mint();
        monitoring.metrics_record_brc20_transfer();
        monitoring.metrics_record_brc20_transfer_send();

        // Get the counter values
        let mut mfs = monitoring.brc20_deploy_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            2.0,
            "Should have recorded 2 deploy operations"
        );

        mfs = monitoring.brc20_mint_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            3.0,
            "Should have recorded 3 mint operations"
        );

        mfs = monitoring.brc20_transfer_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            1.0,
            "Should have recorded 1 transfer operation"
        );

        mfs = monitoring.brc20_transfer_send_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            1.0,
            "Should have recorded 1 transfer send operation"
        );
    }
}
