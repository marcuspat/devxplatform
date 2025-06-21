package com.devxplatform.springboot.controller;

import com.devxplatform.springboot.exception.ResourceNotFoundException;
import com.devxplatform.springboot.model.User;
import com.devxplatform.springboot.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for UserController.
 */
@WebMvcTest(UserController.class)
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setActive(true);
    }

    @Test
    void createUser_Success() throws Exception {
        // Given
        when(userService.createUser(any(User.class))).thenReturn(testUser);

        // When & Then
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testUser)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.lastName").value("User"))
                .andExpect(jsonPath("$.active").value(true));

        verify(userService).createUser(any(User.class));
    }

    @Test
    void createUser_InvalidData_ReturnsBadRequest() throws Exception {
        // Given - User with invalid data (empty username)
        User invalidUser = new User();
        invalidUser.setEmail("test@example.com");
        invalidUser.setFirstName("Test");
        invalidUser.setLastName("User");

        // When & Then
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidUser)))
                .andExpect(status().isBadRequest());

        verify(userService, never()).createUser(any(User.class));
    }

    @Test
    void getUserById_Success() throws Exception {
        // Given
        when(userService.getUserById(1L)).thenReturn(testUser);

        // When & Then
        mockMvc.perform(get("/api/v1/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"));

        verify(userService).getUserById(1L);
    }

    @Test
    void getUserById_NotFound_ReturnsNotFound() throws Exception {
        // Given
        when(userService.getUserById(1L)).thenThrow(new ResourceNotFoundException("User not found"));

        // When & Then
        mockMvc.perform(get("/api/v1/users/1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Resource Not Found"));

        verify(userService).getUserById(1L);
    }

    @Test
    void getUserByUsername_Success() throws Exception {
        // Given
        when(userService.getUserByUsername("testuser")).thenReturn(testUser);

        // When & Then
        mockMvc.perform(get("/api/v1/users/username/testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));

        verify(userService).getUserByUsername("testuser");
    }

    @Test
    void getAllUsers_Success() throws Exception {
        // Given
        Page<User> userPage = new PageImpl<>(Arrays.asList(testUser));
        when(userService.getAllUsers(any())).thenReturn(userPage);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .param("page", "0")
                .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].username").value("testuser"));

        verify(userService).getAllUsers(any());
    }

    @Test
    void getAllUsers_ActiveOnly_Success() throws Exception {
        // Given
        Page<User> userPage = new PageImpl<>(Arrays.asList(testUser));
        when(userService.getActiveUsers(any())).thenReturn(userPage);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].active").value(true));

        verify(userService).getActiveUsers(any());
    }

    @Test
    void searchUsers_Success() throws Exception {
        // Given
        Page<User> userPage = new PageImpl<>(Arrays.asList(testUser));
        when(userService.searchUsers(eq("test"), any())).thenReturn(userPage);

        // When & Then
        mockMvc.perform(get("/api/v1/users/search")
                .param("q", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].username").value("testuser"));

        verify(userService).searchUsers(eq("test"), any());
    }

    @Test
    void updateUser_Success() throws Exception {
        // Given
        User updatedUser = new User();
        updatedUser.setId(1L);
        updatedUser.setUsername("testuser");
        updatedUser.setEmail("updated@example.com");
        updatedUser.setFirstName("Updated");
        updatedUser.setLastName("User");
        updatedUser.setActive(true);

        when(userService.updateUser(eq(1L), any(User.class))).thenReturn(updatedUser);

        // When & Then
        mockMvc.perform(put("/api/v1/users/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("updated@example.com"))
                .andExpect(jsonPath("$.firstName").value("Updated"));

        verify(userService).updateUser(eq(1L), any(User.class));
    }

    @Test
    void deactivateUser_Success() throws Exception {
        // Given
        doNothing().when(userService).deactivateUser(1L);

        // When & Then
        mockMvc.perform(patch("/api/v1/users/1/deactivate"))
                .andExpect(status().isOk());

        verify(userService).deactivateUser(1L);
    }

    @Test
    void deleteUser_Success() throws Exception {
        // Given
        doNothing().when(userService).deleteUser(1L);

        // When & Then
        mockMvc.perform(delete("/api/v1/users/1"))
                .andExpect(status().isNoContent());

        verify(userService).deleteUser(1L);
    }

    @Test
    void checkUsernameExists_ReturnsTrue() throws Exception {
        // Given
        when(userService.existsByUsername("testuser")).thenReturn(true);

        // When & Then
        mockMvc.perform(get("/api/v1/users/exists/username/testuser"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(userService).existsByUsername("testuser");
    }

    @Test
    void checkEmailExists_ReturnsFalse() throws Exception {
        // Given
        when(userService.existsByEmail("test@example.com")).thenReturn(false);

        // When & Then
        mockMvc.perform(get("/api/v1/users/exists/email/test@example.com"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));

        verify(userService).existsByEmail("test@example.com");
    }

    @Test
    void getUserStats_Success() throws Exception {
        // Given
        when(userService.getActiveUserCount()).thenReturn(10L);

        // When & Then
        mockMvc.perform(get("/api/v1/users/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeUsers").value(10));

        verify(userService).getActiveUserCount();
    }
}