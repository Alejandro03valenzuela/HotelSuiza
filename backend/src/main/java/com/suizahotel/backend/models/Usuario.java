package com.suizahotel.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
@Entity
@Table(name = "usuarios")
public class Usuario {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 150)
    private String nombre;
    
    @Column(nullable = false, unique = true, length = 150)
    private String email;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    private String telefono;
    
    @Column(name = "email_verificado")
    private Boolean emailVerificado = false;
    
    @Column(name = "otp_code", length = 6)
    private String otpCode;
    
    @Column(name = "otp_expires_at")
    private OffsetDateTime otpExpiresAt;
    
    @Column(name = "otp_attempts")
    private Integer otpAttempts = 0;
    
    @Column(name = "reset_code", length = 6)
    private String resetCode;
    
    @Column(name = "reset_expires_at")
    private OffsetDateTime resetExpiresAt;
    
    @Column(name = "reset_attempts")
    private Integer resetAttempts = 0;
    
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}