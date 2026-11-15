package com.suizahotel.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class EmailService {

    @Value("${resend.api-key}")
    private String apiKey;

    @Value("${resend.from-email}")
    private String fromEmail;

    @Value("${resend.from-name:Hotel Suiza}")
    private String fromName;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String RESEND_URL = "https://api.resend.com/emails";

    // 1. Enviar código de verificación de registro
    public void enviarCodigoVerificacion(String toEmail, String nombre, String codigo) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7f9fc;">
              <div style="background: #0d2b45; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">HOTEL SUIZA</h1>
              </div>
              <div style="background: #fff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e3e9f0;">
                <p style="font-size: 16px;">Hola <strong>%s</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6;">
                  Bienvenido al Hotel Suiza. Para completar tu registro, ingresa el siguiente código en la página de verificación:
                </p>
                <div style="background: #eef3f8; padding: 24px; text-align: center; margin: 24px 0; border-radius: 6px; border: 1px dashed #0d2b45;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #0d2b45; font-family: 'Courier New', monospace;">%s</span>
                </div>
                <p style="font-size: 14px; color: #555;">Este código expira en <strong>10 minutos</strong>.</p>
              </div>
            </div>
            """.formatted(nombre, codigo);

        enviar(toEmail, "Tu código de verificación — Hotel Suiza", html);
    }

    // 2. Enviar código para recuperar contraseña
    public void enviarCodigoResetPassword(String toEmail, String nombre, String codigo) {
        String html = """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7f9fc;">
              <div style="background: #8b1e1e; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">HOTEL SUIZA</h1>
              </div>
              <div style="background: #fff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e3e9f0;">
                <p style="font-size: 16px;">Hola <strong>%s</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código:
                </p>
                <div style="background: #fdf0f0; padding: 24px; text-align: center; margin: 24px 0; border-radius: 6px; border: 1px dashed #8b1e1e;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #8b1e1e; font-family: 'Courier New', monospace;">%s</span>
                </div>
                <p style="font-size: 14px; color: #555;">Este código expira en <strong>10 minutos</strong>.</p>
              </div>
            </div>
            """.formatted(nombre, codigo);

        enviar(toEmail, "Restablecer contraseña — Hotel Suiza", html);
    }

    // 3. Método interno para conectar con Resend
    private void enviar(String toEmail, String subject, String html) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
            "from", fromName + " <" + fromEmail + ">",
            "to", new String[]{ toEmail },
            "subject", subject,
            "html", html
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(RESEND_URL, request, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Resend falló: " + response.getStatusCode() + " - " + response.getBody());
            }
            System.out.println("✅ Correo enviado a " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ Error al enviar correo a " + toEmail + ": " + e.getMessage());
            throw new RuntimeException("No se pudo enviar el correo", e);
        }
    }
}