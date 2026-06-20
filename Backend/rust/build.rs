fn main() {
    tonic_build::configure()
        .build_server(false)
        .compile(&["../proto/ai_service.proto"], &["../proto"])
        .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
}
