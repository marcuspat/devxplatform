use thiserror::Error;
use tonic::{Code, Status};

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Internal Server Error")]
    InternalServerError,
    
    #[error("Bad Request: {0}")]
    BadRequest(String),
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Forbidden")]
    Forbidden,
    
    #[error("Not Found: {0}")]
    NotFound(String),
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Database error")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("JWT error")]
    JwtError(#[from] jsonwebtoken::errors::Error),
    
    #[error("Hash error")]
    HashError(#[from] bcrypt::BcryptError),
}

impl From<AppError> for Status {
    fn from(error: AppError) -> Self {
        match error {
            AppError::InternalServerError => Status::internal(error.to_string()),
            AppError::BadRequest(msg) => Status::invalid_argument(msg),
            AppError::Unauthorized => Status::unauthenticated(error.to_string()),
            AppError::Forbidden => Status::permission_denied(error.to_string()),
            AppError::NotFound(msg) => Status::not_found(msg),
            AppError::Conflict(msg) => Status::already_exists(msg),
            AppError::DatabaseError(_) => Status::internal("Database error"),
            AppError::ValidationError(msg) => Status::invalid_argument(msg),
            AppError::JwtError(_) => Status::unauthenticated("Invalid token"),
            AppError::HashError(_) => Status::internal("Authentication error"),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;