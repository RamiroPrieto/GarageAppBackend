import type { LegalContent } from '../legal.types';

export const es: LegalContent = {
  updated: 'Última actualización: 25 de noviembre de 2026',
  missing: {
    name: '[nombre del responsable: a completar]',
    address: '[domicilio: a completar]',
  },
  pages: ({ name, address, vat, email, euRepresentative }) => ({
    privacy: {
      title: 'Política de privacidad',
      sections: [
        {
          body: [
            'Esta política explica qué datos personales usa GarageApp, para qué y qué derechos tenés. GarageApp es una app que conecta a conductores con propietarios de espacios de estacionamiento.',
          ],
        },
        {
          heading: '1. Responsable del tratamiento',
          body: [
            [
              `Responsable: ${name}`,
              `Domicilio: ${address}`,
              ...(vat ? [`Número de IVA / identificación fiscal: ${vat}`] : []),
              `Contacto: ${email}`,
              ...(euRepresentative
                ? [`Representante en la Unión Europea: ${euRepresentative}`]
                : []),
            ],
          ],
        },
        {
          heading: '2. Qué datos tratamos',
          body: [
            [
              'Cuenta: nombre, apellido, email, contraseña (guardada cifrada de forma irreversible), teléfono si lo agregás y foto de perfil si la subís.',
              'Inicio de sesión con Google: el identificador de tu cuenta, tu nombre, tu email y tu foto de perfil. Nunca recibimos tu contraseña de Google.',
              'Vehículos: patente y, si los cargás, marca, modelo y color.',
              'Espacios publicados: título, descripción, dirección, ubicación en el mapa, precio, características y fotos.',
              'Reservas: espacio, vehículo, horarios, precio, estado y confirmaciones de inicio.',
              'Pagos y créditos: importes, fechas, estado, saldo e identificadores de Stripe. Los datos de tu tarjeta los recibe y guarda Stripe; nosotros no los vemos.',
              'Ubicación: si das permiso, la ubicación del dispositivo mientras usás la app. No la usamos en segundo plano ni guardamos un historial en tu cuenta.',
              'Cámara: solo si elegís escanear tu tarjeta al pagar.',
              'Notificaciones: si las aceptás, el identificador de tu dispositivo para enviarlas.',
              'Soporte: lo que nos escribís.',
              'Datos técnicos: dirección IP y registros del servidor, necesarios para el funcionamiento y la seguridad. Las búsquedas por cercanía envían coordenadas al servidor y pueden figurar en esos registros.',
            ],
            'Los datos marcados como necesarios al registrarte, reservar o publicar hacen falta para prestar el servicio. El teléfono, las fotos, la ubicación y las notificaciones son opcionales.',
          ],
        },
        {
          heading: '3. Para qué los usamos y con qué base legal',
          body: [
            [
              'Crear tu cuenta, publicar espacios y gestionar reservas, pagos, recordatorios y soporte: ejecución del contrato (art. 6.1.b del RGPD).',
              'Cumplir obligaciones contables, fiscales y legales: obligación legal (art. 6.1.c).',
              'Prevenir fraudes y abusos, proteger el servicio y resolver reclamos: interés legítimo (art. 6.1.f).',
              'Ubicación del dispositivo, acceso a fotos, cámara y notificaciones: tu consentimiento (art. 6.1.a), que podés retirar desde los ajustes del teléfono.',
            ],
            'No vendemos tus datos, no mostramos publicidad, no te rastreamos en otras apps o webs y no tomamos decisiones únicamente automatizadas que te afecten jurídicamente.',
          ],
        },
        {
          heading: '4. Quién puede ver tus datos',
          body: [
            [
              'Público: los espacios publicados, con su dirección, ubicación, precio y fotos.',
              'Propietario del espacio que reservás: tu nombre, tu email, tu vehículo y los datos de la reserva.',
              'Si sos propietario y hace falta para transferirte lo que te corresponde: las personas de nuestro equipo que gestionan ese pago.',
              'Autoridades, cuando la ley lo exija.',
            ],
            'También usamos proveedores que tratan datos para prestar el servicio:',
            [
              'Railway: servidores y base de datos.',
              'Stripe: pagos con tarjeta y prevención de fraude.',
              'Google: inicio de sesión, mapas, direcciones y entrega de notificaciones en Android.',
              'Apple: entrega de notificaciones en iOS.',
              'Expo: envío de notificaciones.',
              'Twilio: verificación del teléfono por SMS.',
              'Resend: emails del servicio y solicitudes de soporte.',
              'Cloudflare: recepción de los emails que enviás a nuestra dirección de contacto.',
            ],
            'Algunos de estos proveedores, como Stripe, Google o Apple, también tratan datos como responsables independientes según sus propias políticas.',
          ],
        },
        {
          heading: '5. Transferencias fuera del Espacio Económico Europeo',
          body: [
            'Algunos proveedores pueden tratar datos fuera del Espacio Económico Europeo, incluso en Estados Unidos. Cuando ocurre, la transferencia debe apoyarse en una decisión de adecuación o en garantías como las cláusulas contractuales tipo de la Comisión Europea. Podés pedirnos más información por email.',
          ],
        },
        {
          heading: '6. Cuánto tiempo los guardamos',
          body: [
            [
              'Datos de la cuenta, vehículos y espacios: mientras tengas la cuenta.',
              'Al eliminar la cuenta: borramos o anonimizamos tus datos personales, salvo lo que debamos conservar por ley o para defender reclamos.',
              'Registros de reservas, pagos y créditos: se conservan sin tu nombre ni email, durante el plazo que exijan las normas contables y fiscales (en Italia, por regla general, 10 años). Stripe conserva sus propios registros.',
              'Mensajes de soporte: el tiempo necesario para resolverlos y acreditar la respuesta.',
              'Registros técnicos y copias de seguridad: por un período limitado.',
            ],
          ],
        },
        {
          heading: '7. Tus derechos',
          body: [
            `Podés pedir acceso, rectificación, borrado, limitación, portabilidad u oposición, y retirar tu consentimiento, escribiendo a ${email}. Respondemos en el plazo legal, por regla general un mes.`,
            'Podés editar tu perfil y eliminar tu cuenta desde la app. También podés reclamar ante tu autoridad de protección de datos; en Italia, el Garante per la protezione dei dati personali (www.garanteprivacy.it).',
          ],
        },
        {
          heading: '8. Seguridad',
          body: [
            'Usamos conexiones cifradas, contraseñas protegidas con un algoritmo irreversible, sesiones con vencimiento y límites a los intentos de acceso. Ningún sistema es totalmente seguro: si detectás un problema, escribinos.',
          ],
        },
        {
          heading: '9. Menores',
          body: [
            'GarageApp es para mayores de 18 años. Si creés que un menor nos dio sus datos, escribinos y los eliminaremos.',
          ],
        },
        {
          heading: '10. Cambios',
          body: [
            'Si cambiamos esta política, actualizaremos la fecha de esta página y avisaremos de los cambios importantes.',
          ],
        },
      ],
    },
    terms: {
      title: 'Términos y condiciones',
      sections: [
        {
          heading: '1. Quiénes somos',
          body: [
            `GarageApp es operada por ${name}, con domicilio en ${address}${vat ? `, identificación fiscal ${vat}` : ''}. Contacto: ${email}. Al crear una cuenta o usar la app aceptás estos términos.`,
          ],
        },
        {
          heading: '2. El servicio',
          body: [
            'GarageApp conecta a conductores con propietarios de espacios de estacionamiento y gestiona la reserva y el cobro. Salvo indicación en contrario, el espacio lo ofrece su propietario y GarageApp no lo posee ni lo administra. GarageApp no presta un servicio de custodia del vehículo.',
          ],
        },
        {
          heading: '3. Tu cuenta',
          body: [
            'Tenés que ser mayor de 18 años, dar información verdadera y mantenerla actualizada. Sos responsable de cuidar tu acceso y de avisarnos si alguien lo usa sin permiso.',
          ],
        },
        {
          heading: '4. Reservas',
          body: [
            [
              'La duración mínima es de una hora.',
              'Al reservar, el espacio queda retenido 10 minutos mientras pagás. Si no se paga a tiempo, la reserva vence.',
              'La reserva se confirma cuando se aprueba el pago.',
              'El inicio lo confirman en la app el conductor y el propietario, desde 10 minutos antes del horario.',
              'Tenés que usar el espacio solo en el horario reservado, con un vehículo que entre en él, y retirarte a tiempo.',
            ],
          ],
        },
        {
          heading: '5. Precios y pagos',
          body: [
            'El precio total se muestra antes de pagar. Los pagos con tarjeta los procesa Stripe. Si un cobro se aprueba cuando la reserva ya venció o fue cancelada, se reembolsa al mismo medio de pago.',
          ],
        },
        {
          heading: '6. Créditos',
          body: [
            '100 créditos equivalen a 1 USD y solo sirven para pagar reservas en GarageApp. No se transfieren a otras personas ni se cambian por dinero, salvo cuando la ley lo exija. Para reservas en euros, la cantidad de créditos se muestra antes de pagar.',
          ],
        },
        {
          heading: '7. Cancelaciones y reembolsos',
          body: [
            'Podés cancelar sin costo una reserva todavía no pagada. Por ahora la app no permite cancelar una reserva ya pagada.',
            `Si el espacio no estaba disponible, no correspondía a lo publicado o tuviste otro problema, escribinos a ${email} o desde Asistencia en la app, con los datos de la reserva. Analizamos cada caso.`,
            'Nada de esto limita los derechos que la ley te reconoce como consumidor, incluidos los de desistimiento y reembolso cuando correspondan.',
          ],
        },
        {
          heading: '8. Propietarios',
          body: [
            [
              'Declarás que tenés derecho a ofrecer el espacio y que cumplís las normas aplicables, incluidas las fiscales, las del edificio y las de tu contrato.',
              'Tenés que publicar información y fotos verdaderas, mantener la disponibilidad actualizada y respetar las reservas confirmadas.',
              'En los pagos con tarjeta GarageApp retiene una comisión del 10% del precio. El resto se transfiere fuera de la app, con el medio y en el plazo acordados con vos.',
              'Conservás los derechos sobre tus fotos y textos y nos autorizás a mostrarlos en GarageApp mientras estén publicados.',
            ],
          ],
        },
        {
          heading: '9. Uso permitido',
          body: [
            'No podés publicar contenido falso, ilegal u ofensivo, hacerte pasar por otra persona, usar datos de otros usuarios para algo ajeno a la reserva, eludir los pagos ni afectar la seguridad del servicio. Podés denunciar contenido escribiéndonos.',
            'Podemos retirar contenido o suspender cuentas que incumplan estos términos o la ley. Salvo urgencia o prohibición legal, te informaremos el motivo y podrás pedir una revisión.',
          ],
        },
        {
          heading: '10. Responsabilidad',
          body: [
            'Cada usuario responde por sus actos y por los daños que cause. Procuramos que el servicio funcione bien, pero no garantizamos que esté siempre disponible.',
            'En la medida que permita la ley, no respondemos por lo que hagan otros usuarios ni por el estado de los espacios. No excluimos la responsabilidad por dolo, culpa grave, daños a las personas ni ninguna otra que la ley no permita excluir.',
          ],
        },
        {
          heading: '11. Eliminar la cuenta',
          body: [
            'Podés eliminar tu cuenta cuando quieras desde Configuración, siempre que no tengas reservas en curso ni créditos sin usar. En esos casos, escribinos.',
          ],
        },
        {
          heading: '12. Cambios, ley aplicable y reclamos',
          body: [
            'Podemos modificar estos términos y avisaremos con antelación razonable de los cambios importantes. Los cambios no afectan a las reservas ya confirmadas.',
            'Se aplica la ley del país donde está establecido el responsable, sin privarte de la protección obligatoria de la ley del país donde vivís. Si sos consumidor, podés acudir a los tribunales de tu domicilio cuando la ley lo prevea.',
            `Antes de iniciar un reclamo te pedimos que nos escribas a ${email}.`,
          ],
        },
      ],
    },
    'delete-account': {
      title: 'Eliminar tu cuenta de GarageApp',
      sections: [
        {
          heading: 'Desde la app',
          body: [
            'Abrí GarageApp, entrá en Configuración, tocá «Eliminar cuenta» y confirmá. No se puede deshacer.',
          ],
        },
        {
          heading: 'Sin la app',
          body: [
            `Escribí a ${email} desde el email de tu cuenta con el asunto «Eliminar cuenta». Podemos pedirte que confirmes tu identidad.`,
          ],
        },
        {
          heading: 'Qué se elimina',
          body: [
            [
              'Tu nombre, email, teléfono, foto, contraseña y vínculo con Google.',
              'Tus vehículos y los identificadores de notificaciones.',
              'Los datos y fotos de los espacios que publicaste.',
              'Solicitamos a Stripe que elimine tu perfil de cliente.',
            ],
          ],
        },
        {
          heading: 'Qué se conserva',
          body: [
            'Los registros de reservas, pagos y créditos, sin tu nombre ni email, durante el plazo que exijan las normas contables y fiscales (en Italia, por regla general, 10 años). Las copias de seguridad, los registros técnicos y los mensajes de soporte pueden conservarse por un período limitado.',
          ],
        },
        {
          heading: 'Reservas o créditos pendientes',
          body: [
            `Si tenés reservas en curso, la app te pedirá esperar a que terminen. Si tenés créditos, podés usarlos o escribirnos a ${email} y lo resolvemos para que puedas eliminar la cuenta.`,
          ],
        },
      ],
    },
    support: {
      title: 'Soporte de GarageApp',
      sections: [
        {
          body: [
            `Escribinos a ${email}. Si tenés cuenta, también podés hacerlo desde Configuración, Asistencia.`,
            'Para un problema con una reserva, indicá la dirección del espacio, el día y el horario. No envíes datos de tu tarjeta ni tu contraseña.',
          ],
        },
        {
          heading: 'Responsable del servicio',
          body: [`${name}, ${address}${vat ? `, ${vat}` : ''}`],
        },
      ],
    },
  }),
};
