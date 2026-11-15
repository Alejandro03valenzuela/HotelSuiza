package com.suizahotel.backend.services;

import com.suizahotel.backend.models.Usuario;
import com.suizahotel.backend.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // 1. Registrar un nuevo usuario y enviar OTP
    public void registrarUsuario(String nombre, String email, String password, String telefono) {
        if (usuarioRepository.existsByEmail(email)) {
            throw new RuntimeException("El correo ya está registrado.");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(nombre);
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(password));
        usuario.setTelefono(telefono);
        usuario.setEmailVerificado(false);

        // Generar código OTP de 6 dígitos
        String otp = generarCodigoOTP();
        usuario.setOtpCode(otp);
        usuario.setOtpExpiresAt(OffsetDateTime.now().plusMinutes(10));
        usuario.setOtpAttempts(0);

        usuarioRepository.save(usuario);

        // Enviar el correo con Resend
        emailService.enviarCodigoVerificacion(email, nombre, otp);
    }

    // 2. Verificar el OTP
    public Usuario verificarCuenta(String email, String codigoIngresado) {
        Optional<Usuario> opt = usuarioRepository.findByEmail(email);
        if (opt.isEmpty()) throw new RuntimeException("Usuario no encontrado.");

        Usuario usuario = opt.get();
        if (usuario.getEmailVerificado()) throw new RuntimeException("El correo ya está verificado.");

        if (usuario.getOtpExpiresAt() == null || usuario.getOtpExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new RuntimeException("El código ha expirado. Solicita uno nuevo.");
        }

        if (usuario.getOtpAttempts() >= 5) {
            throw new RuntimeException("Demasiados intentos fallidos. Solicita un nuevo código.");
        }

        if (!usuario.getOtpCode().equals(codigoIngresado)) {
            usuario.setOtpAttempts(usuario.getOtpAttempts() + 1);
            usuarioRepository.save(usuario);
            throw new RuntimeException("Código incorrecto.");
        }

        // Éxito: Verificamos al usuario
        usuario.setEmailVerificado(true);
        usuario.setOtpCode(null);
        usuario.setOtpExpiresAt(null);
        usuario.setOtpAttempts(0);
        return usuarioRepository.save(usuario);
    }

    // 3. Iniciar sesión
    public Usuario login(String email, String password) {
        Optional<Usuario> opt = usuarioRepository.findByEmail(email);
        if (opt.isEmpty()) throw new RuntimeException("Credenciales incorrectas.");

        Usuario usuario = opt.get();
        if (!usuario.getEmailVerificado()) throw new RuntimeException("Debes verificar tu correo primero.");

        if (!passwordEncoder.matches(password, usuario.getPasswordHash())) {
            throw new RuntimeException("Credenciales incorrectas.");
        }

        return usuario;
    }

    // 4. Solicitar recuperación de contraseña
    public void solicitarRecuperacion(String email) {
        Optional<Usuario> opt = usuarioRepository.findByEmail(email);
        if (opt.isEmpty()) return; // No revelamos si el correo existe o no por seguridad

        Usuario usuario = opt.get();
        String resetCode = generarCodigoOTP();
        usuario.setResetCode(resetCode);
        usuario.setResetExpiresAt(OffsetDateTime.now().plusMinutes(10));
        usuario.setResetAttempts(0);
        usuarioRepository.save(usuario);

        emailService.enviarCodigoResetPassword(email, usuario.getNombre(), resetCode);
    }

    // 5. Cambiar contraseña usando el código
    public void cambiarPassword(String email, String codigo, String newPassword) {
        Optional<Usuario> opt = usuarioRepository.findByEmail(email);
        if (opt.isEmpty()) throw new RuntimeException("Usuario no encontrado.");

        Usuario usuario = opt.get();
        if (usuario.getResetExpiresAt() == null || usuario.getResetExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new RuntimeException("El código ha expirado.");
        }

        if (!usuario.getResetCode().equals(codigo)) {
            throw new RuntimeException("Código incorrecto.");
        }

        usuario.setPasswordHash(passwordEncoder.encode(newPassword));
        usuario.setResetCode(null);
        usuario.setResetExpiresAt(null);
        usuarioRepository.save(usuario);
    }

    // Helper para generar 6 dígitos aleatorios
    private String generarCodigoOTP() {
        SecureRandom random = new SecureRandom();
        int num = random.nextInt(900000) + 100000;
        return String.valueOf(num);
    }
}