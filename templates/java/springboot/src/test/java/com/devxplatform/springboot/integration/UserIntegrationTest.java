package com.devxplatform.springboot.integration;

import com.devxplatform.springboot.model.User;
import com.devxplatform.springboot.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for User CRUD operations.
 * 
 * These tests use:
 * - SpringBootTest with random port for full integration testing
 * - TestContainers with PostgreSQL for real database operations
 * - TestRestTemplate for HTTP requests
 * - H2 in-memory database as fallback for CI environments
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@AutoConfigureWebMvc
public class UserIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String baseUrl;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port + "/api/v1/users";
        userRepository.deleteAll(); // Clean database before each test
    }

    @Test
    void testCreateUser_Success() throws Exception {
        // Given
        User newUser = new User();
        newUser.setUsername("johndoe");
        newUser.setEmail("john.doe@example.com");
        newUser.setFirstName("John");
        newUser.setLastName("Doe");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<User> request = new HttpEntity<>(newUser, headers);

        // When
        ResponseEntity<User> response = restTemplate.postForEntity(baseUrl, request, User.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isNotNull();
        assertThat(response.getBody().getUsername()).isEqualTo("johndoe");
        assertThat(response.getBody().getEmail()).isEqualTo("john.doe@example.com");
        assertThat(response.getBody().getFirstName()).isEqualTo("John");
        assertThat(response.getBody().getLastName()).isEqualTo("Doe");
        assertThat(response.getBody().getActive()).isTrue();
        assertThat(response.getBody().getCreatedAt()).isNotNull();
        assertThat(response.getBody().getUpdatedAt()).isNotNull();

        // Verify user exists in database
        assertThat(userRepository.count()).isEqualTo(1);
        User savedUser = userRepository.findByUsername("johndoe").orElse(null);
        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo("john.doe@example.com");
    }

    @Test
    void testCreateUser_DuplicateUsername() throws Exception {
        // Given - Create initial user
        User existingUser = new User("johndoe", "john.doe@example.com", "John", "Doe");
        userRepository.save(existingUser);

        // Attempt to create user with same username
        User duplicateUser = new User();
        duplicateUser.setUsername("johndoe");
        duplicateUser.setEmail("another.email@example.com");
        duplicateUser.setFirstName("Jane");
        duplicateUser.setLastName("Doe");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<User> request = new HttpEntity<>(duplicateUser, headers);

        // When
        ResponseEntity<Map> response = restTemplate.postForEntity(baseUrl, request, Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).asString().contains("Username already exists");
    }

    @Test
    void testGetUser_Success() throws Exception {
        // Given
        User savedUser = userRepository.save(new User("johndoe", "john.doe@example.com", "John", "Doe"));

        // When
        ResponseEntity<User> response = restTemplate.getForEntity(baseUrl + "/" + savedUser.getId(), User.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(savedUser.getId());
        assertThat(response.getBody().getUsername()).isEqualTo("johndoe");
        assertThat(response.getBody().getEmail()).isEqualTo("john.doe@example.com");
    }

    @Test
    void testGetUser_NotFound() throws Exception {
        // When
        ResponseEntity<Map> response = restTemplate.getForEntity(baseUrl + "/999999", Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).asString().contains("not found");
    }

    @Test
    void testUpdateUser_Success() throws Exception {
        // Given
        User savedUser = userRepository.save(new User("johndoe", "john.doe@example.com", "John", "Doe"));

        // Create updated user data
        User updatedUser = new User();
        updatedUser.setUsername("johndoe"); // Keep same username
        updatedUser.setEmail("john.updated@example.com");
        updatedUser.setFirstName("John");
        updatedUser.setLastName("Updated");
        updatedUser.setActive(true);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<User> request = new HttpEntity<>(updatedUser, headers);

        // When
        ResponseEntity<User> response = restTemplate.exchange(
                baseUrl + "/" + savedUser.getId(), 
                HttpMethod.PUT, 
                request, 
                User.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(savedUser.getId());
        assertThat(response.getBody().getEmail()).isEqualTo("john.updated@example.com");
        assertThat(response.getBody().getLastName()).isEqualTo("Updated");

        // Verify in database
        User dbUser = userRepository.findById(savedUser.getId()).orElse(null);
        assertThat(dbUser).isNotNull();
        assertThat(dbUser.getEmail()).isEqualTo("john.updated@example.com");
        assertThat(dbUser.getLastName()).isEqualTo("Updated");
    }

    @Test
    void testUpdateUser_NotFound() throws Exception {
        // Given
        User updatedUser = new User("johndoe", "john.doe@example.com", "John", "Doe");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<User> request = new HttpEntity<>(updatedUser, headers);

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/999999", 
                HttpMethod.PUT, 
                request, 
                Map.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).asString().contains("not found");
    }

    @Test
    void testDeleteUser_Success() throws Exception {
        // Given
        User savedUser = userRepository.save(new User("johndoe", "john.doe@example.com", "John", "Doe"));
        assertThat(userRepository.existsById(savedUser.getId())).isTrue();

        // When
        ResponseEntity<Void> response = restTemplate.exchange(
                baseUrl + "/" + savedUser.getId(), 
                HttpMethod.DELETE, 
                null, 
                Void.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Verify user is deleted from database
        assertThat(userRepository.existsById(savedUser.getId())).isFalse();
        assertThat(userRepository.count()).isEqualTo(0);
    }

    @Test
    void testDeleteUser_NotFound() throws Exception {
        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/999999", 
                HttpMethod.DELETE, 
                null, 
                Map.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).asString().contains("not found");
    }

    @Test
    void testGetAllUsers_WithPagination() throws Exception {
        // Given
        userRepository.save(new User("user1", "user1@example.com", "User", "One"));
        userRepository.save(new User("user2", "user2@example.com", "User", "Two"));
        userRepository.save(new User("user3", "user3@example.com", "User", "Three"));

        // When
        ResponseEntity<Map> response = restTemplate.getForEntity(
                baseUrl + "?page=0&size=2&sortBy=username&sortDir=asc", 
                Map.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        
        Map<String, Object> pageData = (Map<String, Object>) response.getBody();
        assertThat(pageData.get("totalElements")).isEqualTo(3);
        assertThat(pageData.get("size")).isEqualTo(2);
        assertThat(pageData.get("number")).isEqualTo(0);
        assertThat(pageData.get("numberOfElements")).isEqualTo(2);
    }

    @Test
    void testSearchUsers() throws Exception {
        // Given
        userRepository.save(new User("johndoe", "john.doe@example.com", "John", "Doe"));
        userRepository.save(new User("janedoe", "jane.doe@example.com", "Jane", "Doe"));
        userRepository.save(new User("bobsmith", "bob.smith@example.com", "Bob", "Smith"));

        // When - Search for users with "doe" in name/username
        ResponseEntity<Map> response = restTemplate.getForEntity(
                baseUrl + "/search?q=doe&page=0&size=10", 
                Map.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        
        Map<String, Object> pageData = (Map<String, Object>) response.getBody();
        assertThat(pageData.get("totalElements")).isEqualTo(2);
        assertThat(pageData.get("numberOfElements")).isEqualTo(2);
    }

    @Test
    void testUserCRUDWorkflow_CompleteFlow() throws Exception {
        // Test complete CRUD workflow
        
        // 1. CREATE USER
        User newUser = new User();
        newUser.setUsername("workflowuser");
        newUser.setEmail("workflow@example.com");
        newUser.setFirstName("Work");
        newUser.setLastName("Flow");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<User> createRequest = new HttpEntity<>(newUser, headers);

        ResponseEntity<User> createResponse = restTemplate.postForEntity(baseUrl, createRequest, User.class);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long userId = createResponse.getBody().getId();
        assertThat(userId).isNotNull();

        // 2. READ USER
        ResponseEntity<User> readResponse = restTemplate.getForEntity(baseUrl + "/" + userId, User.class);
        assertThat(readResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(readResponse.getBody().getUsername()).isEqualTo("workflowuser");

        // 3. UPDATE USER
        User updateUser = new User();
        updateUser.setUsername("workflowuser");
        updateUser.setEmail("workflow.updated@example.com");
        updateUser.setFirstName("Updated");
        updateUser.setLastName("User");
        updateUser.setActive(true);

        HttpEntity<User> updateRequest = new HttpEntity<>(updateUser, headers);
        ResponseEntity<User> updateResponse = restTemplate.exchange(
                baseUrl + "/" + userId, 
                HttpMethod.PUT, 
                updateRequest, 
                User.class
        );
        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody().getEmail()).isEqualTo("workflow.updated@example.com");
        assertThat(updateResponse.getBody().getFirstName()).isEqualTo("Updated");

        // 4. DELETE USER
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                baseUrl + "/" + userId, 
                HttpMethod.DELETE, 
                null, 
                Void.class
        );
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // 5. VERIFY DELETION
        ResponseEntity<Map> verifyResponse = restTemplate.getForEntity(baseUrl + "/" + userId, Map.class);
        assertThat(verifyResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}