use crate::errors::{AppError, AppResult};
use crate::models::user::{CreateUser, UpdateUser, User, PaginatedResponse, UserResponse};
use crate::utils::{hash_password, verify_password};
use sqlx::{PgPool, postgres::PgRow, Row};
use uuid::Uuid;

pub struct UserService {
    db: PgPool,
}

impl UserService {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn create_user(&self, create_user: CreateUser) -> AppResult<User> {
        // Check if user already exists
        let existing = sqlx::query("SELECT id FROM users WHERE email = $1 OR username = $2")
            .bind(&create_user.email)
            .bind(&create_user.username)
            .fetch_optional(&self.db)
            .await?;

        if existing.is_some() {
            return Err(AppError::Conflict("User with this email or username already exists".to_string()));
        }

        // Hash password
        let password_hash = hash_password(&create_user.password)?;

        // Insert user
        let user = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (email, username, password_hash, full_name)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#
        )
        .bind(&create_user.email)
        .bind(&create_user.username)
        .bind(&password_hash)
        .bind(&create_user.full_name)
        .fetch_one(&self.db)
        .await?;

        Ok(user)
    }

    pub async fn get_user_by_id(&self, user_id: Uuid) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    pub async fn get_user_by_email(&self, email: &str) -> AppResult<User> {
        let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
            .bind(email)
            .fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    pub async fn get_users(&self, page: u32, limit: u32) -> AppResult<PaginatedResponse<UserResponse>> {
        let offset = (page - 1) * limit;
        
        // Get total count
        let total: i64 = sqlx::query("SELECT COUNT(*) FROM users")
            .fetch_one(&self.db)
            .await?
            .get(0);

        // Get users
        let users = sqlx::query_as::<_, User>(
            "SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.db)
        .await?;

        let user_responses: Vec<UserResponse> = users.into_iter().map(|u| u.into()).collect();
        let total_pages = ((total as f64) / (limit as f64)).ceil() as u32;

        Ok(PaginatedResponse {
            data: user_responses,
            total,
            page,
            limit,
            total_pages,
        })
    }

    pub async fn update_user(&self, user_id: Uuid, update_user: UpdateUser) -> AppResult<User> {
        // Build dynamic update query
        let mut query = String::from("UPDATE users SET updated_at = NOW()");
        let mut bind_count = 1;
        let mut bindings = vec![];

        if let Some(email) = &update_user.email {
            query.push_str(&format!(", email = ${}", bind_count));
            bindings.push(email as &(dyn sqlx::Encode<'_, sqlx::Postgres> + Sync));
            bind_count += 1;
        }

        if let Some(username) = &update_user.username {
            query.push_str(&format!(", username = ${}", bind_count));
            bindings.push(username as &(dyn sqlx::Encode<'_, sqlx::Postgres> + Sync));
            bind_count += 1;
        }

        if let Some(full_name) = &update_user.full_name {
            query.push_str(&format!(", full_name = ${}", bind_count));
            bindings.push(full_name as &(dyn sqlx::Encode<'_, sqlx::Postgres> + Sync));
            bind_count += 1;
        }

        if let Some(is_active) = &update_user.is_active {
            query.push_str(&format!(", is_active = ${}", bind_count));
            bindings.push(is_active as &(dyn sqlx::Encode<'_, sqlx::Postgres> + Sync));
            bind_count += 1;
        }

        query.push_str(&format!(" WHERE id = ${} RETURNING *", bind_count));

        let mut q = sqlx::query_as::<_, User>(&query);
        for binding in bindings {
            q = q.bind(binding);
        }
        q = q.bind(user_id);

        let user = q.fetch_optional(&self.db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    pub async fn delete_user(&self, user_id: Uuid) -> AppResult<()> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id)
            .execute(&self.db)
            .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound("User not found".to_string()));
        }

        Ok(())
    }

    pub async fn verify_user_credentials(&self, email: &str, password: &str) -> AppResult<User> {
        let user = self.get_user_by_email(email).await?;
        
        if !user.is_active {
            return Err(AppError::Forbidden);
        }

        if !verify_password(password, &user.password_hash)? {
            return Err(AppError::Unauthorized);
        }

        Ok(user)
    }
}