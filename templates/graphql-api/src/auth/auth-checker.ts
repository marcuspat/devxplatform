import { AuthChecker } from 'type-graphql';
import { Context } from '../types/context';

export const authChecker: AuthChecker<Context> = (
  { context },
  roles
) => {
  // Check if user is authenticated
  if (!context.user) {
    return false;
  }

  // If no specific roles required, authentication is enough
  if (roles.length === 0) {
    return true;
  }

  // Check if user has required role
  if (roles.includes(context.user.role)) {
    return true;
  }

  return false;
};