use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use anyhow::Result;
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod config;
mod errors;
mod handlers;
mod middleware;
mod models;
mod services;
mod utils;

use crate::config::Settings;
use crate::handlers::{health, users};
use crate::middleware::{auth::AuthMiddleware, request_id::RequestId};
use crate::services::user_service::UserService;

pub struct AppState {
    pub db: sqlx::PgPool,
    pub settings: Settings,
    pub user_service: Arc<UserService>,
}

#[actix_web::main]
async fn main() -> Result<()> {
    // Load environment variables
    dotenv().ok();

    // Initialize tracing
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("setting default subscriber failed");

    // Load configuration
    let settings = Settings::new()?;
    let bind_address = format!("{}:{}", settings.server.host, settings.server.port);

    info!("Starting server at {}", bind_address);

    // Create database pool
    let db_pool = PgPoolOptions::new()
        .max_connections(settings.database.max_connections)
        .connect(&settings.database.url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&db_pool).await?;

    // Initialize services
    let user_service = Arc::new(UserService::new(db_pool.clone()));

    // Create app state
    let app_state = web::Data::new(AppState {
        db: db_pool,
        settings: settings.clone(),
        user_service,
    });

    // Start HTTP server
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .app_data(app_state.clone())
            .wrap(cors)
            .wrap(Logger::default())
            .wrap(RequestId::new())
            .wrap(tracing_actix_web::TracingLogger::default())
            .service(
                web::scope("/api/v1")
                    .service(health::health_check)
                    .service(health::readiness_check)
                    .service(
                        web::scope("/users")
                            .wrap(AuthMiddleware)
                            .service(users::get_users)
                            .service(users::get_user)
                            .service(users::create_user)
                            .service(users::update_user)
                            .service(users::delete_user),
                    )
                    .service(
                        web::scope("/auth")
                            .service(users::login)
                            .service(users::register)
                            .service(users::refresh_token),
                    ),
            )
    })
    .bind(&bind_address)?
    .run()
    .await?;

    Ok(())
}