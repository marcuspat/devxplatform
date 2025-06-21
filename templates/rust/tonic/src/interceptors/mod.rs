use tonic::{Request, Status};
use crate::utils::decode_jwt_token;
use crate::models::Claims;

pub fn auth_interceptor(mut req: Request<()>) -> Result<Request<()>, Status> {
    let token = match req.metadata().get("authorization") {
        Some(t) => t,
        None => return Err(Status::unauthenticated("No authorization token provided")),
    };

    let token_str = token
        .to_str()
        .map_err(|_| Status::unauthenticated("Invalid authorization token"))?;

    // Remove "Bearer " prefix if present
    let token_str = if token_str.starts_with("Bearer ") {
        &token_str[7..]
    } else {
        token_str
    };

    // For now, we'll skip actual JWT validation in the interceptor
    // In a real implementation, you'd want to access the app settings here
    // This is a simplified version
    
    Ok(req)
}

pub fn logging_interceptor(req: Request<()>) -> Result<Request<()>, Status> {
    tracing::info!(
        "Received request: {:?} from {:?}",
        req.uri(),
        req.remote_addr()
    );
    Ok(req)
}