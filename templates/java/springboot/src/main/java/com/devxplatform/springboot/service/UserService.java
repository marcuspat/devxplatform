package com.devxplatform.springboot.service;

import com.devxplatform.springboot.exception.ResourceNotFoundException;
import com.devxplatform.springboot.exception.DuplicateResourceException;
import com.devxplatform.springboot.model.User;
import com.devxplatform.springboot.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service class for User operations.
 * 
 * Provides business logic for user management including:
 * - CRUD operations
 * - Search functionality
 * - Caching support
 * - Transaction management
 * - Validation and error handling
 */
@Service
@Transactional
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Create a new user.
     * 
     * @param user the user to create
     * @return the created user
     * @throws DuplicateResourceException if username or email already exists
     */
    public User createUser(User user) {
        logger.info("Creating new user with username: {}", user.getUsername());
        
        validateUserForCreation(user);
        
        User savedUser = userRepository.save(user);
        logger.info("Successfully created user with ID: {}", savedUser.getId());
        
        return savedUser;
    }

    /**
     * Get user by ID.
     * 
     * @param id the user ID
     * @return the user
     * @throws ResourceNotFoundException if user not found
     */
    @Cacheable(value = "users", key = "#id")
    @Transactional(readOnly = true)
    public User getUserById(Long id) {
        logger.debug("Retrieving user by ID: {}", id);
        
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }

    /**
     * Get user by username.
     * 
     * @param username the username
     * @return the user
     * @throws ResourceNotFoundException if user not found
     */
    @Cacheable(value = "users", key = "#username")
    @Transactional(readOnly = true)
    public User getUserByUsername(String username) {
        logger.debug("Retrieving user by username: {}", username);
        
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    /**
     * Get all users with pagination.
     * 
     * @param pageable pagination information
     * @return page of users
     */
    @Transactional(readOnly = true)
    public Page<User> getAllUsers(Pageable pageable) {
        logger.debug("Retrieving all users with pagination");
        return userRepository.findAll(pageable);
    }

    /**
     * Get all active users with pagination.
     * 
     * @param pageable pagination information
     * @return page of active users
     */
    @Transactional(readOnly = true)
    public Page<User> getActiveUsers(Pageable pageable) {
        logger.debug("Retrieving active users with pagination");
        return userRepository.findByActiveTrue(pageable);
    }

    /**
     * Search users by search term.
     * 
     * @param searchTerm the search term
     * @param pageable pagination information
     * @return page of matching users
     */
    @Transactional(readOnly = true)
    public Page<User> searchUsers(String searchTerm, Pageable pageable) {
        logger.debug("Searching users with term: {}", searchTerm);
        return userRepository.searchUsers(searchTerm, pageable);
    }

    /**
     * Update an existing user.
     * 
     * @param id the user ID
     * @param userDetails the updated user details
     * @return the updated user
     * @throws ResourceNotFoundException if user not found
     */
    @CacheEvict(value = "users", key = "#id")
    public User updateUser(Long id, User userDetails) {
        logger.info("Updating user with ID: {}", id);
        
        User existingUser = getUserById(id);
        
        // Update fields
        existingUser.setFirstName(userDetails.getFirstName());
        existingUser.setLastName(userDetails.getLastName());
        existingUser.setEmail(userDetails.getEmail());
        existingUser.setActive(userDetails.getActive());
        
        // Validate email uniqueness if changed
        if (!existingUser.getEmail().equals(userDetails.getEmail()) && 
            userRepository.existsByEmail(userDetails.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + userDetails.getEmail());
        }
        
        User updatedUser = userRepository.save(existingUser);
        logger.info("Successfully updated user with ID: {}", updatedUser.getId());
        
        return updatedUser;
    }

    /**
     * Deactivate a user.
     * 
     * @param id the user ID
     * @throws ResourceNotFoundException if user not found
     */
    @CacheEvict(value = "users", key = "#id")
    public void deactivateUser(Long id) {
        logger.info("Deactivating user with ID: {}", id);
        
        User user = getUserById(id);
        user.setActive(false);
        userRepository.save(user);
        
        logger.info("Successfully deactivated user with ID: {}", id);
    }

    /**
     * Delete a user.
     * 
     * @param id the user ID
     * @throws ResourceNotFoundException if user not found
     */
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        logger.info("Deleting user with ID: {}", id);
        
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with ID: " + id);
        }
        
        userRepository.deleteById(id);
        logger.info("Successfully deleted user with ID: {}", id);
    }

    /**
     * Check if username exists.
     * 
     * @param username the username to check
     * @return true if username exists
     */
    @Transactional(readOnly = true)
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    /**
     * Check if email exists.
     * 
     * @param email the email to check
     * @return true if email exists
     */
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Get total count of active users.
     * 
     * @return count of active users
     */
    @Transactional(readOnly = true)
    public long getActiveUserCount() {
        return userRepository.countByActiveTrue();
    }

    /**
     * Validate user for creation.
     * 
     * @param user the user to validate
     * @throws DuplicateResourceException if username or email already exists
     */
    private void validateUserForCreation(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new DuplicateResourceException("Username already exists: " + user.getUsername());
        }
        
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + user.getEmail());
        }
    }
}