use actix_web::{get, web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::AppState;

#[derive(Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize)]
pub struct ReadinessResponse {
    pub status: String,
    pub database: String,
    pub timestamp: String,
}

#[get("/health")]
pub async fn health_check() -> HttpResponse {
    let response = HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    
    HttpResponse::Ok().json(response)
}

#[get("/ready")]
pub async fn readiness_check(app_state: web::Data<AppState>) -> HttpResponse {
    // Check database connection
    let db_status = match sqlx::query("SELECT 1")
        .fetch_one(&app_state.db)
        .await
    {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };
    
    let response = ReadinessResponse {
        status: if db_status == "connected" { "ready" } else { "not ready" }.to_string(),
        database: db_status.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    
    if db_status == "connected" {
        HttpResponse::Ok().json(response)
    } else {
        HttpResponse::ServiceUnavailable().json(response)
    }
}