"""
Authentication schemas
"""
from marshmallow import Schema, fields, validate


class LoginSchema(Schema):
    """Login request schema"""
    username = fields.String(
        required=True,
        validate=validate.Length(min=3, max=120),
        description="Username or email"
    )
    password = fields.String(
        required=True,
        validate=validate.Length(min=8),
        load_only=True
    )


class RegisterSchema(Schema):
    """Registration request schema"""
    email = fields.Email(
        required=True,
        validate=validate.Length(max=120)
    )
    username = fields.String(
        required=True,
        validate=[
            validate.Length(min=3, max=80),
            validate.Regexp(
                r'^[a-zA-Z0-9_.-]+$',
                error="Username must contain only letters, numbers, dots, hyphens and underscores"
            )
        ]
    )
    password = fields.String(
        required=True,
        validate=validate.Length(min=8),
        load_only=True
    )
    full_name = fields.String(
        validate=validate.Length(max=120),
        missing=None
    )