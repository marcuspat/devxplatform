use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use tonic::transport::Server;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod config;
mod errors;
mod interceptors;
mod models;
mod services;
mod utils;

use crate::config::Settings;
use crate::interceptors::{auth_interceptor, logging_interceptor};
use crate::services::{health::HealthServiceImpl, user::UserServiceImpl};

// Include the generated proto files
pub mod proto {
    pub mod health {
        pub mod v1 {
            tonic::include_proto!("health.v1");
        }
    }
    pub mod user {
        pub mod v1 {
            tonic::include_proto!("user.v1");
        }
    }
}

use proto::health::v1::health_service_server::HealthServiceServer;
use proto::user::v1::user_service_server::UserServiceServer;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub settings: Settings,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize tracing
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    // Load configuration
    let settings = Settings::new()?;
    let addr: SocketAddr = format!("{}:{}", settings.server.host, settings.server.port).parse()?;

    info!("Starting gRPC server at {}", addr);

    // Create database pool
    let db_pool = PgPoolOptions::new()
        .max_connections(settings.database.max_connections)
        .connect(&settings.database.url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&db_pool).await?;

    // Create app state
    let app_state = Arc::new(AppState {
        db: db_pool,
        settings: settings.clone(),
    });

    // Create services
    let health_service = HealthServiceImpl::new(app_state.clone());
    let user_service = UserServiceImpl::new(app_state.clone());

    // Build the server
    let server = Server::builder()
        .layer(tower::ServiceBuilder::new().layer(tower_http::trace::TraceLayer::new_for_grpc()))
        .add_service(HealthServiceServer::new(health_service))
        .add_service(
            UserServiceServer::with_interceptor(user_service, auth_interceptor)
        )
        .serve(addr);

    // Run the server
    server.await?;

    Ok(())
}