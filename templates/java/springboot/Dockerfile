# Multi-stage Dockerfile for Spring Boot DevX Platform Template

# Build stage
FROM maven:3.9.5-openjdk-17-slim AS build
LABEL stage=builder

# Set working directory
WORKDIR /app

# Copy Maven configuration files
COPY pom.xml .
COPY src ./src

# Build the application (skip tests for faster build - tests should run in CI/CD)
RUN mvn clean package -DskipTests

# Runtime stage
FROM openjdk:17-jre-slim AS runtime

# Install security updates and create non-root user
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r appuser && \
    useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Create logs directory and set permissions
RUN mkdir -p /app/logs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Set JVM options for containerized environment
ENV JAVA_OPTS="-Xmx512m -Xms256m -XX:+UseG1GC -XX:+UseStringDeduplication -Djava.security.egd=file:/dev/./urandom"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

# Labels for better container management
LABEL \
    maintainer="DevX Platform <devx@example.com>" \
    version="1.0.0" \
    description="Spring Boot DevX Platform Template" \
    org.opencontainers.image.title="SpringBoot DevX Template" \
    org.opencontainers.image.description="Enterprise-grade Spring Boot template for microservices" \
    org.opencontainers.image.version="1.0.0" \
    org.opencontainers.image.authors="DevX Platform" \
    org.opencontainers.image.url="https://github.com/devxplatform/templates" \
    org.opencontainers.image.source="https://github.com/devxplatform/templates/java/springboot" \
    org.opencontainers.image.licenses="MIT"