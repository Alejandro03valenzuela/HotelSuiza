package com.suizahotel.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "reservas")
public class Reserva {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔥 LA MAGIA ESTÁ AQUÍ:
    // Le decimos a Java: "No intentes insertar ni actualizar esto, Supabase se encarga".
    @Column(name = "codigo", insertable = false, updatable = false)
    private String codigo;

    private String name;
    private String email;
    private String phone;
    private String room;
    private String assignedRoomNumber;
    private LocalDate checkin;
    private LocalDate checkout;
    private Integer nights;
    private String guests;
    private Double price;
    private Double total;
    private Double depositAmount;
    private Double amountPaid;
    private Double balanceDue;
    
    private String paymentReference;
    private String paymentMethod;
    private String paymentStatus;
    private String status;
    
    private LocalDateTime checkedInAt;
    private LocalDateTime checkedOutAt;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}