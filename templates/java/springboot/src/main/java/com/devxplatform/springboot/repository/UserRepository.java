package com.devxplatform.springboot.repository;

import com.devxplatform.springboot.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity.
 * 
 * Provides CRUD operations and custom query methods for User entities.
 * Extends JpaRepository to inherit standard data access methods.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by username.
     * 
     * @param username the username to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByUsername(String username);

    /**
     * Find user by email address.
     * 
     * @param email the email to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if username exists.
     * 
     * @param username the username to check
     * @return true if username exists
     */
    boolean existsByUsername(String username);

    /**
     * Check if email exists.
     * 
     * @param email the email to check
     * @return true if email exists
     */
    boolean existsByEmail(String email);

    /**
     * Find all active users.
     * 
     * @return list of active users
     */
    List<User> findByActiveTrue();

    /**
     * Find all inactive users.
     * 
     * @return list of inactive users
     */
    List<User> findByActiveFalse();

    /**
     * Find active users with pagination.
     * 
     * @param pageable pagination information
     * @return page of active users
     */
    Page<User> findByActiveTrue(Pageable pageable);

    /**
     * Search users by first name or last name containing the search term (case-insensitive).
     * 
     * @param searchTerm the search term
     * @param pageable pagination information
     * @return page of matching users
     */
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    Page<User> searchUsers(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Count active users.
     * 
     * @return number of active users
     */
    long countByActiveTrue();

    /**
     * Find users by first name and last name.
     * 
     * @param firstName the first name
     * @param lastName the last name
     * @return list of matching users
     */
    List<User> findByFirstNameAndLastName(String firstName, String lastName);
}