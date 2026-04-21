const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!resend) {
  console.warn('⚠️ Missing RESEND_API_KEY. Email service is disabled.');
}

/**
 * Send a verification code to a user
 * @param {string} email 
 * @param {string} code 
 */
async function sendVerificationCode(email, code) {
  if (!resend) return;
  try {
    const { data, error } = await resend.emails.send({
      from: 'Saphir Group <onboarding@resend.dev>', // Note: Use a verified domain in production
      to: [email],
      subject: 'Code de vérification Saphir Group',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;">
          <h2 style="color: #0ea5e9;">Saphir Group - Sécurité</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé une modification de vos informations d'accès. Voici votre code de vérification à usage unique :</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">Ce code expirera dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Saphir Group • Gestion Administrative Immobilière</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw new Error('Erreur lors de l\'envoi de l\'e-mail');
    }

    return data;
  } catch (err) {
    console.error('Email Service Error:', err);
    throw err;
  }
}

/**
 * Send an invitation to a new user
 * @param {string} email 
 * @param {string} temporaryPassword 
 * @param {string} name 
 */
async function sendInvitationEmail(email, temporaryPassword, name) {
  if (!resend) return;
  try {
    const { data, error } = await resend.emails.send({
      from: 'Saphir Group <onboarding@resend.dev>',
      to: [email],
      subject: 'Bienvenue chez Saphir Group - Vos accès',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px;">
          <h2 style="color: #0ea5e9;">Bienvenue chez Saphir Group</h2>
          <p>Bonjour ${name},</p>
          <p>Un compte a été créé pour vous sur la plateforme de gestion Saphir Group. Voici vos accès temporaires :</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 24px 0;">
            <p style="margin: 0 0 10px 0;"><strong>E-mail :</strong> ${email}</p>
            <p style="margin: 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">${temporaryPassword}</code></p>
          </div>
          <p>Pour votre sécurité, nous vous recommandons de <strong>changer votre mot de passe</strong> dès votre première connexion dans l'onglet <strong>Paramètres</strong>.</p>
          <a href="https://saphir-app.onrender.com/login" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Accéder à l'application</a>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">Saphir Group • Gestion Administrative Immobilière</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      throw new Error('Erreur lors de l\'envoi de l\'invitation');
    }

    return data;
  } catch (err) {
    console.error('Invitation Service Error:', err);
    throw err;
  }
}

module.exports = { sendVerificationCode, sendInvitationEmail };
