package com.suizahotel.backend.controllers;

import com.suizahotel.backend.models.Reserva;
import com.suizahotel.backend.repositories.ReservaRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reservas")
@CrossOrigin(origins = "*")
public class ReservaController {

    private final ReservaRepository reservaRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ReservaController(ReservaRepository reservaRepository) {
        this.reservaRepository = reservaRepository;
    }

    @GetMapping
    public List<Reserva> obtenerTodas() {
        return reservaRepository.findAll();
    }

    // 🔥 Agregamos @Transactional para que podamos limpiar la caché de Hibernate
    @PostMapping
    @Transactional
    public Reserva crearReserva(@RequestBody Reserva reserva) {
        // 1. Guardamos en Supabase
        Reserva guardada = reservaRepository.save(reserva);
        
        // 2. Forzamos a que Hibernate envíe el INSERT a Supabase
        entityManager.flush(); 
        
        // 3. Limpiamos la memoria caché de Hibernate (aquí se olvida del objeto con código null)
        entityManager.clear(); 
        
        // 4. Buscamos de nuevo. Ahora sí, leerá el código real (SUI-B69290) desde Supabase
        return reservaRepository.findById(guardada.getId()).orElse(guardada);
    }

    @PutMapping("/{id}")
    public Reserva actualizarReserva(@PathVariable Long id, @RequestBody Reserva reservaActualizada) {
        return reservaRepository.findById(id).map(reserva -> {
            reserva.setStatus(reservaActualizada.getStatus());
            reserva.setPaymentStatus(reservaActualizada.getPaymentStatus());
            reserva.setAmountPaid(reservaActualizada.getAmountPaid());
            reserva.setBalanceDue(reservaActualizada.getBalanceDue());
            reserva.setAssignedRoomNumber(reservaActualizada.getAssignedRoomNumber());
            reserva.setCheckedInAt(reservaActualizada.getCheckedInAt());
            reserva.setCheckedOutAt(reservaActualizada.getCheckedOutAt());
            return reservaRepository.save(reserva);
        }).orElseThrow(() -> new RuntimeException("Reserva no encontrada"));
    }

    @DeleteMapping("/{id}")
    public void eliminarReserva(@PathVariable Long id) {
        reservaRepository.deleteById(id);
    }
}