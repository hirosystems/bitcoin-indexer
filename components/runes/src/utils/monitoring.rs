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
    // Performance metrics
    pub block_processing_time: Histogram,
    pub rune_parsing_time: Histogram,
    pub rune_computation_time: Histogram,
    pub rune_db_write_time: Histogram,

    // Volumetric metrics
    pub runes_per_block: U64Counter,

    // Health metrics
    pub chain_tip_distance: UInt64Gauge,
    pub processing_errors: U64Counter,

    // Runes specific metrics
    pub runes_etching_operations: U64Counter,
    pub runes_mint_operations: U64Counter,
    pub runes_burn_operations: U64Counter,
    pub runes_transfer_operations: U64Counter,
    pub last_indexed_block_height: UInt64Gauge,
    pub last_indexed_rune_number: UInt64Gauge,

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

        // Performance metrics
        let block_processing_time = Self::create_and_register_histogram(
            &registry,
            "runes_block_processing_time",
            "Time taken to process a block in milliseconds",
            vec![
                10.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0, 10000.0,
            ],
        );
        let rune_parsing_time = Self::create_and_register_histogram(
            &registry,
            "rune_parsing_time",
            "Time taken to parse Runes operations in milliseconds",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );
        let rune_computation_time = Self::create_and_register_histogram(
            &registry,
            "rune_computation_time",
            "Time taken to compute Runes data in milliseconds",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );
        let rune_db_write_time = Self::create_and_register_histogram(
            &registry,
            "rune_db_write_time",
            "Time taken to write Runes data to database in milliseconds",
            vec![1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0],
        );

        // Volumetric metrics
        let runes_per_block = Self::create_and_register_counter(
            &registry,
            "runes_per_block",
            "Number of Runes per block",
        );

        // Health metrics
        let chain_tip_distance = Self::create_and_register_uint64_gauge(
            &registry,
            "runes_chain_tip_distance",
            "Distance in blocks from the Bitcoin chain tip",
        );
        let processing_errors = Self::create_and_register_counter(
            &registry,
            "processing_errors",
            "Count of processing errors encountered",
        );

        // Runes specific metrics
        let runes_etching_operations = Self::create_and_register_counter(
            &registry,
            "runes_etching_operations",
            "Number of Runes etchings processed",
        );
        let runes_mint_operations = Self::create_and_register_counter(
            &registry,
            "runes_mint_operations",
            "Number of Runes mints processed",
        );
        let runes_burn_operations = Self::create_and_register_counter(
            &registry,
            "runes_burn_operations",
            "Number of Runes burns processed",
        );
        let runes_transfer_operations = Self::create_and_register_counter(
            &registry,
            "runes_transfer_operations",
            "Number of Runes transfers processed",
        );
        let last_indexed_block_height = Self::create_and_register_uint64_gauge(
            &registry,
            "last_indexed_block_height",
            "Height of the last indexed block",
        );
        let last_indexed_rune_number = Self::create_and_register_uint64_gauge(
            &registry,
            "last_indexed_rune_number",
            "Number of the last indexed Rune",
        );

        PrometheusMonitoring {
            block_processing_time,
            rune_parsing_time,
            rune_computation_time,
            rune_db_write_time,
            runes_per_block,
            chain_tip_distance,
            processing_errors,
            runes_etching_operations,
            runes_mint_operations,
            runes_burn_operations,
            runes_transfer_operations,
            last_indexed_block_height,
            last_indexed_rune_number,
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

    pub fn initialize(&self, max_rune_number: u64, block_height: u64) {
        self.metrics_block_indexed(block_height);
        self.metrics_rune_indexed(max_rune_number);
        // TODO: add inital values for metrics here
    }

    // Performance metrics methods
    pub fn metrics_record_block_processing_time(&self, process_time: f64) {
        self.block_processing_time.observe(process_time);
    }

    pub fn metrics_record_rune_parsing_time(&self, ms: f64) {
        self.rune_parsing_time.observe(ms);
    }

    pub fn metrics_record_rune_computation_time(&self, ms: f64) {
        self.rune_computation_time.observe(ms);
    }

    pub fn metrics_record_rune_db_write_time(&self, ms: f64) {
        self.rune_db_write_time.observe(ms);
    }

    // Volumetric metrics methods
    pub fn metrics_record_runes_in_block(&self, count: u64) {
        self.runes_per_block.inc_by(count);
    }

    // Health metrics methods
    pub fn metrics_update_chain_tip_distance(&self, distance: u64) {
        self.chain_tip_distance.set(distance);
    }

    pub fn metrics_record_processing_errors(&self) {
        self.processing_errors.inc();
    }

    // Runes specific metrics methods
    pub fn metrics_record_runes_etching(&self) {
        self.runes_etching_operations.inc();
    }

    pub fn metrics_record_runes_mint(&self) {
        self.runes_mint_operations.inc();
    }

    pub fn metrics_record_runes_burn(&self) {
        self.runes_burn_operations.inc();
    }

    pub fn metrics_record_runes_transfer(&self) {
        self.runes_transfer_operations.inc();
    }

    pub fn metrics_block_indexed(&self, block_height: u64) {
        let highest_appended = self.last_indexed_block_height.get();
        if block_height > highest_appended {
            self.last_indexed_block_height.set(block_height);
        }
    }

    pub fn metrics_rune_indexed(&self, rune_number: u64) {
        let highest_appended = self.last_indexed_rune_number.get();
        if rune_number > highest_appended {
            self.last_indexed_rune_number.set(rune_number);
        }
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

        // Simulate some processing time
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
    fn test_rune_parsing_time() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different parsing times
        monitoring.metrics_record_rune_parsing_time(50.0);
        monitoring.metrics_record_rune_parsing_time(150.0);

        // Get the histogram values directly
        let mut mfs = monitoring.rune_parsing_time.collect();
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
    fn test_runes_computation_time() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different computation times
        monitoring.metrics_record_rune_computation_time(75.0);
        monitoring.metrics_record_rune_computation_time(200.0);

        // Get the histogram values directly
        let mut mfs = monitoring.rune_computation_time.collect();
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
    fn test_rune_db_write_time() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different write times
        monitoring.metrics_record_rune_db_write_time(25.0);
        monitoring.metrics_record_rune_db_write_time(100.0);

        // Get the histogram values directly
        let mut mfs = monitoring.rune_db_write_time.collect();
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
    fn test_runes_in_block() {
        let monitoring = PrometheusMonitoring::new();

        // Test with different operation counts
        monitoring.metrics_record_runes_in_block(5);
        monitoring.metrics_record_runes_in_block(10);

        // Get the counter value
        let mut mfs = monitoring.runes_per_block.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();

        // Verify the total count (5 + 10 = 15)
        assert_eq!(
            counter.get_value(),
            15.0,
            "Total operations count should be 15"
        );
    }

    #[test]
    fn test_metric_registry() {
        let monitoring = PrometheusMonitoring::new();

        // Record some test metrics
        monitoring.metrics_record_rune_parsing_time(50.0);
        monitoring.metrics_record_rune_computation_time(75.0);
        monitoring.metrics_record_rune_db_write_time(25.0);

        // Verify registry contains the metrics
        let metrics = monitoring.registry.gather();

        // Verify all expected metrics exist
        assert!(verify_metric_exists(&metrics, "rune_parsing_time"));
        assert!(verify_metric_exists(&metrics, "rune_computation_time"));
        assert!(verify_metric_exists(&metrics, "rune_db_write_time"));
    }

    #[test]
    fn test_runes_processing_error() {
        let monitoring = PrometheusMonitoring::new();

        // Record some processing errors
        monitoring.metrics_record_processing_errors();
        monitoring.metrics_record_processing_errors();
        monitoring.metrics_record_processing_errors();

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
    fn test_runes_operations() {
        let monitoring = PrometheusMonitoring::new();

        // Record different types of Runes operations
        monitoring.metrics_record_runes_etching();
        monitoring.metrics_record_runes_etching();
        monitoring.metrics_record_runes_mint();
        monitoring.metrics_record_runes_mint();
        monitoring.metrics_record_runes_mint();
        monitoring.metrics_record_runes_burn();
        monitoring.metrics_record_runes_transfer();

        // Get the counter values
        let mut mfs = monitoring.runes_etching_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            2.0,
            "Should have recorded 2 etching operations"
        );

        mfs = monitoring.runes_mint_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            3.0,
            "Should have recorded 3 mint operations"
        );

        mfs = monitoring.runes_burn_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            1.0,
            "Should have recorded 1 burn operation"
        );

        mfs = monitoring.runes_transfer_operations.collect();
        assert_eq!(mfs.len(), 1);
        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let counter = m.get_counter();
        assert_eq!(
            counter.get_value(),
            1.0,
            "Should have recorded 1 transfer operation"
        );
    }

    #[test]
    fn test_block_indexed() {
        let monitoring = PrometheusMonitoring::new();

        // Record block indexing
        monitoring.metrics_block_indexed(100);
        monitoring.metrics_block_indexed(200);

        // Get the counter value
        let mut mfs = monitoring.last_indexed_block_height.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let gauge = m.get_gauge();

        // Verify the total count (100 + 200 = 300)
        assert_eq!(
            gauge.get_value(),
            200.0,
            "Highest block height indexed should be 200"
        );
    }

    #[test]
    fn test_rune_indexed() {
        let monitoring = PrometheusMonitoring::new();

        // Record rune indexing
        monitoring.metrics_rune_indexed(50);
        monitoring.metrics_rune_indexed(100);

        // Get the counter value
        let mut mfs = monitoring.last_indexed_rune_number.collect();
        assert_eq!(mfs.len(), 1);

        let mf = mfs.pop().unwrap();
        let m = mf.get_metric().first().unwrap();
        let gauge = m.get_gauge();

        // Verify the total count (50 + 100 = 150)
        assert_eq!(
            gauge.get_value(),
            100.0,
            "Highest rune number indexed should be 100"
        );
    }
}
