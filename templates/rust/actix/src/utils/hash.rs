use crate::errors::AppResult;
use bcrypt::{hash, verify, DEFAULT_COST};

pub fn hash_password(password: &str) -> AppResult<String> {
    let hashed = hash(password, DEFAULT_COST)?;
    Ok(hashed)
}

pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let valid = verify(password, hash)?;
    Ok(valid)
}