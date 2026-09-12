fn main() {
    // Cargo only reruns this script on source changes by default, so editing
    // an icon alone (no .rs changes) would silently keep the old icon
    // embedded in the binary. Watch the icons folder explicitly.
    println!("cargo:rerun-if-changed=icons");
    tauri_build::build()
}
