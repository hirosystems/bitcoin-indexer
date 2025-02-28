pub mod cli;

#[macro_use]
extern crate hiro_system_kit;

#[cfg(feature = "tcmalloc")]
#[global_allocator]
static GLOBAL: tcmalloc2::TcMalloc = tcmalloc2::TcMalloc;

fn main() {
    cli::main();
}
