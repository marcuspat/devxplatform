"""
User schemas
"""
from marshmallow import Schema, fields, validate


class UserSchema(Schema):
    """User response schema"""
    id = fields.Integer(dump_only=True)
    email = fields.Email(dump_only=True)
    username = fields.String(dump_only=True)
    full_name = fields.String()
    is_active = fields.Boolean()
    is_admin = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    last_login = fields.DateTime(dump_only=True)


class UserUpdateSchema(Schema):
    """User update request schema"""
    email = fields.Email(
        validate=validate.Length(max=120)
    )
    username = fields.String(
        validate=[
            validate.Length(min=3, max=80),
            validate.Regexp(
                r'^[a-zA-Z0-9_.-]+$',
                error="Username must contain only letters, numbers, dots, hyphens and underscores"
            )
        ]
    )
    password = fields.String(
        validate=validate.Length(min=8),
        load_only=True
    )
    full_name = fields.String(
        validate=validate.Length(max=120)
    )