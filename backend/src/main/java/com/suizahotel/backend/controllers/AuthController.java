package com.suizahotel.backend.controllers;

import com.suizahotel.backend.models.Usuario;
import com.suizahotel.backend.services.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UsuarioService usuarioService;

    // 1. Endpoint para registrar un nuevo cliente
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String nombre = body.get("nombre");
            String email = body.get("email");
            String password = body.get("password");
            String telefono = body.getOrDefault("telefono", "");

            usuarioService.registrarUsuario(nombre, email, password, telefono);
            return ResponseEntity.ok(Map.of("message", "Usuario registrado. Revisa tu correo."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 2. Endpoint para verificar el código OTP
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String codigo = body.get("codigo");

            Usuario usuario = usuarioService.verificarCuenta(email, codigo);
            return ResponseEntity.ok(Map.of(
                "message", "Correo verificado correctamente.",
                "nombre", usuario.getNombre(),
                "email", usuario.getEmail()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 3. Endpoint para iniciar sesión
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");

            Usuario usuario = usuarioService.login(email, password);
            return ResponseEntity.ok(Map.of(
                "message", "Login exitoso.",
                "nombre", usuario.getNombre(),
                "email", usuario.getEmail()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        }
    }

    // 4. Endpoint para solicitar recuperación de contraseña
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            usuarioService.solicitarRecuperacion(email);
            return ResponseEntity.ok(Map.of("message", "Si el correo está registrado, recibirás un código."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 5. Endpoint para cambiar la contraseña con el código
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String codigo = body.get("codigo");
            String password = body.get("password");

            usuarioService.cambiarPassword(email, codigo, password);
            return ResponseEntity.ok(Map.of("message", "Contraseña actualizada exitosamente."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}