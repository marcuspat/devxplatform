"""
Authentication endpoints
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, 
    create_access_token, create_refresh_token
)
from marshmallow import ValidationError

from app import db, limiter
from app.models import User
from app.schemas.auth import LoginSchema, RegisterSchema
from app.exceptions import UnauthorizedError, ConflictError, ValidationError as AppValidationError

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per hour")
def register():
    """Register a new user"""
    schema = RegisterSchema()
    
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        raise AppValidationError(details=e.messages)
    
    # Check if user already exists
    if User.find_by_email(data['email']):
        raise ConflictError('User with this email already exists')
    
    if User.find_by_username(data['username']):
        raise ConflictError('User with this username already exists')
    
    # Create new user
    user = User(
        email=data['email'],
        username=data['username'],
        full_name=data.get('full_name')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Generate tokens
    tokens = user.generate_tokens()
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict(),
        'tokens': tokens
    }), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per hour")
def login():
    """Login user"""
    schema = LoginSchema()
    
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        raise AppValidationError(details=e.messages)
    
    # Find user by email or username
    user = None
    if '@' in data['username']:
        user = User.find_by_email(data['username'])
    else:
        user = User.find_by_username(data['username'])
    
    if not user or not user.check_password(data['password']):
        raise UnauthorizedError('Invalid credentials')
    
    if not user.is_active:
        raise UnauthorizedError('Account is inactive')
    
    # Update last login
    user.last_login = db.func.now()
    db.session.commit()
    
    # Generate tokens
    tokens = user.generate_tokens()
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'tokens': tokens
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    identity = get_jwt_identity()
    
    # Create new access token
    access_token = create_access_token(identity=identity)
    
    return jsonify({
        'access_token': access_token
    })


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    identity = get_jwt_identity()
    user = User.find_by_id(identity['user_id'])
    
    if not user:
        raise UnauthorizedError('User not found')
    
    return jsonify({
        'user': user.to_dict()
    })


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user"""
    # In a real application, you might want to blacklist the token
    # For now, we'll just return a success message
    return jsonify({
        'message': 'Logout successful'
    })