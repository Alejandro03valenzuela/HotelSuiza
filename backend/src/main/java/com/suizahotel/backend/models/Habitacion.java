package com.suizahotel.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Data
@Entity
@Table(name = "habitaciones")
public class Habitacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String tipo;
    
    private Double precio;
    
    // Aseguramos que Hibernate busque "imagen_url" en Postgres
    @Column(name = "imagen_url") 
    private String imagenUrl;
    
    // 🔥 NUEVO: Cantidad de habitaciones de esta categoría
    private Integer cantidad;
    
    // 🔥 NUEVO: Lista de números físicos (se guarda como JSONB en Supabase)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> numeros;

    // Constructor vacío
    public Habitacion() {}

    // Constructor con parámetros actualizado
    public Habitacion(Long id, String tipo, Double precio, String imagenUrl, Integer cantidad, List<String> numeros) {
        this.id = id;
        this.tipo = tipo;
        this.precio = precio;
        this.imagenUrl = imagenUrl;
        this.cantidad = cantidad;
        this.numeros = numeros;
    }
}