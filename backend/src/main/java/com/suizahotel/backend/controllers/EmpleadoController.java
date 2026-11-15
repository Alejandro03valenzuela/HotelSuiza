package com.suizahotel.backend.controllers;

import com.suizahotel.backend.dtos.LoginRequest;
import com.suizahotel.backend.models.Empleado;
import com.suizahotel.backend.repositories.EmpleadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/empleados")
@CrossOrigin(origins = "*")
public class EmpleadoController {

    @Autowired
    private EmpleadoRepository empleadoRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 1. Listar todos
    @GetMapping
    public List<Empleado> listarEmpleados() {
        return empleadoRepository.findAll();
    }

    // 2. Login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<Empleado> empleadoOpt = empleadoRepository.findByUsername(request.getUsername());

        if (empleadoOpt.isEmpty()) return ResponseEntity.status(401).body("Usuario no encontrado");

        Empleado empleado = empleadoOpt.get();
        if (!empleado.getActive()) return ResponseEntity.status(401).body("Usuario inactivo");

        if (passwordEncoder.matches(request.getPassword(), empleado.getPasswordHash())) {
            empleado.setLastLoginAt(OffsetDateTime.now());
            empleadoRepository.save(empleado);
            return ResponseEntity.ok(empleado);
        } else {
            return ResponseEntity.status(401).body("Contraseña incorrecta");
        }
    }

    // 3. Crear un nuevo empleado
    @PostMapping
    public Empleado crearEmpleado(@RequestBody Map<String, String> body) {
        Empleado emp = new Empleado();
        emp.setUsername(body.get("username"));
        emp.setPasswordHash(passwordEncoder.encode(body.get("password")));
        emp.setLabel(body.get("label"));
        emp.setRole(body.get("role"));
        emp.setActive(Boolean.parseBoolean(body.get("active")));
        return empleadoRepository.save(emp);
    }

    // 4. Actualizar empleado
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarEmpleado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Empleado> empOpt = empleadoRepository.findById(id);
        if (empOpt.isEmpty()) return ResponseEntity.notFound().build();

        Empleado emp = empOpt.get();
        emp.setLabel(body.get("label"));
        emp.setRole(body.get("role"));
        emp.setActive(Boolean.parseBoolean(body.get("active")));
        
        String newPassword = body.get("password");
        if (newPassword != null && !newPassword.trim().isEmpty()) {
            emp.setPasswordHash(passwordEncoder.encode(newPassword));
        }
        
        return ResponseEntity.ok(empleadoRepository.save(emp));
    }

    // 5. Eliminar empleado
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarEmpleado(@PathVariable Long id) {
        if (!empleadoRepository.existsById(id)) return ResponseEntity.notFound().build();
        empleadoRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}