package com.devxplatform.springboot.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cache configuration for the Spring Boot application.
 * 
 * Configures caching for improved performance:
 * - User data caching
 * - Cache manager setup
 * - Cache names configuration
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Configure cache manager.
     * 
     * In production, consider using Redis or other distributed cache solutions.
     */
    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        
        // Configure cache names
        cacheManager.setCacheNames(java.util.Arrays.asList(
            "users",
            "userStats",
            "searchResults"
        ));
        
        // Allow dynamic cache creation
        cacheManager.setAllowNullValues(false);
        
        return cacheManager;
    }
}