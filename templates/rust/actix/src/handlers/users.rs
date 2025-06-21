use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

use crate::{
    errors::AppResult,
    models::user::{Claims, CreateUser, LoginRequest, LoginResponse, PaginationParams, UpdateUser, UserResponse},
    utils::create_jwt_token,
    AppState,
};

#[derive(Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[post("/register")]
pub async fn register(
    app_state: web::Data<AppState>,
    user_data: web::Json<CreateUser>,
) -> AppResult<HttpResponse> {
    // Validate input
    user_data.validate()
        .map_err(|e| crate::errors::AppError::ValidationError(e.to_string()))?;
    
    // Create user
    let user = app_state.user_service.create_user(user_data.into_inner()).await?;
    
    // Generate tokens
    let access_token = create_jwt_token(
        user.id,
        &user.email,
        &app_state.settings.jwt.secret,
        app_state.settings.jwt.access_token_expiry / 3600,
    )?;
    
    let refresh_token = create_jwt_token(
        user.id,
        &user.email,
        &app_state.settings.jwt.secret,
        app_state.settings.jwt.refresh_token_expiry / 3600,
    )?;
    
    let response = LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: app_state.settings.jwt.access_token_expiry,
        user: user.into(),
    };
    
    Ok(HttpResponse::Created().json(response))
}

#[post("/login")]
pub async fn login(
    app_state: web::Data<AppState>,
    credentials: web::Json<LoginRequest>,
) -> AppResult<HttpResponse> {
    // Validate input
    credentials.validate()
        .map_err(|e| crate::errors::AppError::ValidationError(e.to_string()))?;
    
    // Verify credentials
    let user = app_state.user_service
        .verify_user_credentials(&credentials.email, &credentials.password)
        .await?;
    
    // Generate tokens
    let access_token = create_jwt_token(
        user.id,
        &user.email,
        &app_state.settings.jwt.secret,
        app_state.settings.jwt.access_token_expiry / 3600,
    )?;
    
    let refresh_token = create_jwt_token(
        user.id,
        &user.email,
        &app_state.settings.jwt.secret,
        app_state.settings.jwt.refresh_token_expiry / 3600,
    )?;
    
    let response = LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: app_state.settings.jwt.access_token_expiry,
        user: user.into(),
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[post("/refresh")]
pub async fn refresh_token(
    app_state: web::Data<AppState>,
    refresh_data: web::Json<RefreshTokenRequest>,
) -> AppResult<HttpResponse> {
    // Decode refresh token
    let claims = crate::utils::decode_jwt_token(
        &refresh_data.refresh_token,
        &app_state.settings.jwt.secret,
    )?;
    
    // Get user
    let user = app_state.user_service.get_user_by_id(claims.sub).await?;
    
    // Generate new tokens
    let access_token = create_jwt_token(
        user.id,
        &user.email,
        &app_state.settings.jwt.secret,
        app_state.settings.jwt.access_token_expiry / 3600,
    )?;
    
    let refresh_token = create_jwt_token(
        user.id,
        &user.email,
        &app_state.settings.jwt.secret,
        app_state.settings.jwt.refresh_token_expiry / 3600,
    )?;
    
    let response = LoginResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: app_state.settings.jwt.access_token_expiry,
        user: user.into(),
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[get("")]
pub async fn get_users(
    app_state: web::Data<AppState>,
    query: web::Query<PaginationParams>,
) -> AppResult<HttpResponse> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);
    
    let users = app_state.user_service.get_users(page, limit).await?;
    
    Ok(HttpResponse::Ok().json(users))
}

#[get("/{id}")]
pub async fn get_user(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let user = app_state.user_service.get_user_by_id(path.into_inner()).await?;
    let user_response: UserResponse = user.into();
    
    Ok(HttpResponse::Ok().json(user_response))
}

#[post("")]
pub async fn create_user(
    app_state: web::Data<AppState>,
    user_data: web::Json<CreateUser>,
) -> AppResult<HttpResponse> {
    // Validate input
    user_data.validate()
        .map_err(|e| crate::errors::AppError::ValidationError(e.to_string()))?;
    
    let user = app_state.user_service.create_user(user_data.into_inner()).await?;
    let user_response: UserResponse = user.into();
    
    Ok(HttpResponse::Created().json(user_response))
}

#[put("/{id}")]
pub async fn update_user(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    user_data: web::Json<UpdateUser>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    // Get claims from request extensions (set by auth middleware)
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or(crate::errors::AppError::Unauthorized)?;
    
    // Check if user is updating their own profile
    let user_id = path.into_inner();
    if claims.sub != user_id {
        return Err(crate::errors::AppError::Forbidden);
    }
    
    // Validate input
    user_data.validate()
        .map_err(|e| crate::errors::AppError::ValidationError(e.to_string()))?;
    
    let user = app_state.user_service.update_user(user_id, user_data.into_inner()).await?;
    let user_response: UserResponse = user.into();
    
    Ok(HttpResponse::Ok().json(user_response))
}

#[delete("/{id}")]
pub async fn delete_user(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    req: HttpRequest,
) -> AppResult<HttpResponse> {
    // Get claims from request extensions (set by auth middleware)
    let claims = req.extensions().get::<Claims>().cloned()
        .ok_or(crate::errors::AppError::Unauthorized)?;
    
    // Check if user is deleting their own profile
    let user_id = path.into_inner();
    if claims.sub != user_id {
        return Err(crate::errors::AppError::Forbidden);
    }
    
    app_state.user_service.delete_user(user_id).await?;
    
    Ok(HttpResponse::NoContent().finish())
}