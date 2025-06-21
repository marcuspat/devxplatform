package com.devxplatform.springboot;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Integration tests for the Spring Boot Template Application.
 */
@SpringBootTest
@ActiveProfiles("test")
class SpringBootTemplateApplicationTests {

    /**
     * Test that the application context loads successfully.
     */
    @Test
    void contextLoads() {
        // This test will pass if the application context loads without errors
    }
}