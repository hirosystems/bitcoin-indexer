use std::process::{Command, exit};

fn main() {
    let status = Command::new("sh")
        .arg("scripts/run-tests.sh")
        .status()
        .expect("Failed to run shell script");

    if let Some(code) = status.code() {
        exit(code);
    } else {
        eprintln!("Process terminated by signal");
        exit(1);
    }
}
