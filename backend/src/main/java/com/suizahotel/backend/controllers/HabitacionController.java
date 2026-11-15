package com.suizahotel.backend.controllers;

import com.suizahotel.backend.models.Habitacion;
import com.suizahotel.backend.repositories.HabitacionRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/habitaciones")
@CrossOrigin(origins = "*")
public class HabitacionController {

    // 1. Declaramos la variable como 'final'
    private final HabitacionRepository habitacionRepository;

    // 2. Creamos el constructor (Spring inyecta la dependencia automáticamente aquí)
    public HabitacionController(HabitacionRepository habitacionRepository) {
        this.habitacionRepository = habitacionRepository;
    }

    @GetMapping
    public List<Habitacion> obtenerTodas() {
        return habitacionRepository.findAll();
    }
}