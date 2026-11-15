package com.suizahotel.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
@Entity
@Table(name = "empleados")
public class Empleado {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    
    // 🔥 OJO: Aquí cambia a passwordHash para que coincida con Supabase
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(nullable = false, length = 100)
    private String label;
    
    @Column(nullable = false, length = 20)
    private String role = "recepcion";
    
    private Boolean active = true;
    
    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;
    
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // Estos métodos guardan la fecha automáticamente al crear o editar
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