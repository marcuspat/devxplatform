"""
User management endpoints
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app import db, cache
from app.models import User
from app.schemas.user import UserSchema, UserUpdateSchema
from app.exceptions import NotFoundError, ForbiddenError, ValidationError as AppValidationError
from app.utils.pagination import paginate

users_bp = Blueprint('users', __name__)


@users_bp.route('/', methods=['GET'])
@jwt_required()
@cache.cached(timeout=60)
def list_users():
    """List all users with pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    
    query = User.query
    
    if search:
        search_filter = f'%{search}%'
        query = query.filter(
            db.or_(
                User.username.ilike(search_filter),
                User.email.ilike(search_filter),
                User.full_name.ilike(search_filter)
            )
        )
    
    pagination = paginate(query, page, per_page)
    schema = UserSchema(many=True)
    
    return jsonify({
        'users': schema.dump(pagination.items),
        'pagination': {
            'total': pagination.total,
            'pages': pagination.pages,
            'page': page,
            'per_page': per_page,
            'has_prev': pagination.has_prev,
            'has_next': pagination.has_next
        }
    })


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get user by ID"""
    user = User.find_by_id(user_id)
    
    if not user:
        raise NotFoundError('User', user_id)
    
    schema = UserSchema()
    return jsonify({
        'user': schema.dump(user)
    })


@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user"""
    current_user = get_jwt_identity()
    
    # Check if user is updating their own profile or is admin
    if current_user['user_id'] != user_id and not current_user.get('is_admin'):
        raise ForbiddenError('Cannot update other users')
    
    user = User.find_by_id(user_id)
    if not user:
        raise NotFoundError('User', user_id)
    
    schema = UserUpdateSchema()
    try:
        data = schema.load(request.get_json())
    except ValidationError as e:
        raise AppValidationError(details=e.messages)
    
    # Update user fields
    for field, value in data.items():
        if field == 'password':
            user.set_password(value)
        else:
            setattr(user, field, value)
    
    db.session.commit()
    
    # Clear cache
    cache.delete_memoized(list_users)
    
    return jsonify({
        'message': 'User updated successfully',
        'user': UserSchema().dump(user)
    })


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete user"""
    current_user = get_jwt_identity()
    
    # Only admins can delete users
    if not current_user.get('is_admin'):
        raise ForbiddenError('Admin access required')
    
    user = User.find_by_id(user_id)
    if not user:
        raise NotFoundError('User', user_id)
    
    # Don't allow deleting yourself
    if current_user['user_id'] == user_id:
        raise ForbiddenError('Cannot delete your own account')
    
    db.session.delete(user)
    db.session.commit()
    
    # Clear cache
    cache.delete_memoized(list_users)
    
    return '', 204


@users_bp.route('/<int:user_id>/activate', methods=['POST'])
@jwt_required()
def activate_user(user_id):
    """Activate user account"""
    current_user = get_jwt_identity()
    
    # Only admins can activate users
    if not current_user.get('is_admin'):
        raise ForbiddenError('Admin access required')
    
    user = User.find_by_id(user_id)
    if not user:
        raise NotFoundError('User', user_id)
    
    user.is_active = True
    db.session.commit()
    
    # Clear cache
    cache.delete_memoized(list_users)
    
    return jsonify({
        'message': 'User activated successfully',
        'user': UserSchema().dump(user)
    })


@users_bp.route('/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
def deactivate_user(user_id):
    """Deactivate user account"""
    current_user = get_jwt_identity()
    
    # Only admins can deactivate users
    if not current_user.get('is_admin'):
        raise ForbiddenError('Admin access required')
    
    user = User.find_by_id(user_id)
    if not user:
        raise NotFoundError('User', user_id)
    
    # Don't allow deactivating yourself
    if current_user['user_id'] == user_id:
        raise ForbiddenError('Cannot deactivate your own account')
    
    user.is_active = False
    db.session.commit()
    
    # Clear cache
    cache.delete_memoized(list_users)
    
    return jsonify({
        'message': 'User deactivated successfully',
        'user': UserSchema().dump(user)
    })