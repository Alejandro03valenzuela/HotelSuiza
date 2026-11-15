package com.suizahotel.backend.services;

import com.suizahotel.backend.models.Empleado;
import com.suizahotel.backend.repositories.EmpleadoRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class EmpleadoService {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Este método se ejecuta automáticamente al arrancar Spring Boot
    @PostConstruct
    public void inicializarEmpleados() {
        if (empleadoRepository.count() == 0) {
            crearEmpleado("recepcion.manana", "Ica#Manana-2026-HS", "Recepción - turno mañana");
            crearEmpleado("recepcion.tarde", "Ica#Tarde-2026-HS", "Recepción - turno tarde");
            crearEmpleado("recepcion.noche", "Ica#Noche-2026-HS", "Recepción - turno noche");
            
            System.out.println("✅ Los 3 empleados por defecto han sido creados en Supabase con contraseñas encriptadas.");
        } else {
            System.out.println("ℹ️ La tabla de empleados ya tiene datos. No se crearon cuentas nuevas.");
        }
    }

    private void crearEmpleado(String username, String passwordPlana, String label) {
        Empleado emp = new Empleado();
        emp.setUsername(username);
        emp.setPasswordHash(passwordEncoder.encode(passwordPlana)); // 🔒 Aquí se encripta
        emp.setLabel(label);
        emp.setRole("admin");
        emp.setActive(true);
        empleadoRepository.save(emp);
    }
}