import type { LegalContent } from '../legal.types';

export const en: LegalContent = {
  updated: 'Last updated: 25 November 2026',
  missing: {
    name: '[name of the operator: to be completed]',
    address: '[address: to be completed]',
  },
  pages: ({ name, address, vat, email, euRepresentative }) => ({
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          body: [
            'This policy explains which personal data GarageApp uses, why, and what your rights are. GarageApp is an app that connects drivers with owners of parking spaces.',
          ],
        },
        {
          heading: '1. Data controller',
          body: [
            [
              `Controller: ${name}`,
              `Address: ${address}`,
              ...(vat ? [`VAT / tax number: ${vat}`] : []),
              `Contact: ${email}`,
              ...(euRepresentative
                ? [`Representative in the European Union: ${euRepresentative}`]
                : []),
            ],
          ],
        },
        {
          heading: '2. Data we process',
          body: [
            [
              'Account: first name, last name, email, password (stored as an irreversible hash), phone number if you add it, and profile photo if you upload one.',
              'Google sign-in: your account identifier, name, email and profile photo. We never receive your Google password.',
              'Vehicles: license plate and, if you enter them, brand, model and color.',
              'Published spaces: title, description, address, map location, price, features and photos.',
              'Bookings: space, vehicle, times, price, status and start confirmations.',
              'Payments and credits: amounts, dates, status, balance and Stripe identifiers. Your card details are received and stored by Stripe; we do not see them.',
              'Location: if you allow it, the location of your device while you use the app. We do not use it in the background or keep a location history in your account.',
              'Camera: only if you choose to scan your card when paying.',
              'Notifications: if you accept them, the identifier of your device needed to send them.',
              'Support: what you write to us.',
              'Technical data: IP address and server logs, needed for operation and security. Nearby searches send coordinates to the server and these may appear in those logs.',
            ],
            'The data marked as required when you register, book or publish is needed to provide the service. Phone number, photos, location and notifications are optional.',
          ],
        },
        {
          heading: '3. Why we use it and on what legal basis',
          body: [
            [
              'Creating your account, publishing spaces and handling bookings, payments, reminders and support: performance of the contract (GDPR art. 6(1)(b)).',
              'Meeting accounting, tax and other legal duties: legal obligation (art. 6(1)(c)).',
              'Preventing fraud and abuse, protecting the service and handling claims: legitimate interest (art. 6(1)(f)).',
              'Device location, photo access, camera and notifications: your consent (art. 6(1)(a)), which you can withdraw in your phone settings.',
            ],
            'We do not sell your data, show advertising, track you across other apps or websites, or take solely automated decisions that have legal effects on you.',
          ],
        },
        {
          heading: '4. Who can see your data',
          body: [
            [
              'The public: published spaces, with their address, location, price and photos.',
              'The owner of the space you book: your name, email, vehicle and the booking details.',
              'If you are an owner and it is needed to transfer what you are due: the members of our team who handle that payment.',
              'Authorities, where the law requires it.',
            ],
            'We also use providers that process data so we can offer the service:',
            [
              'Railway: servers and database.',
              'Stripe: card payments and fraud prevention.',
              'Google: sign-in, maps, addresses and delivery of notifications on Android.',
              'Apple: delivery of notifications on iOS.',
              'Expo: sending notifications.',
              'Twilio: phone verification by SMS.',
              'Resend: service emails and support requests.',
              'Cloudflare: receiving the emails you send to our contact address.',
            ],
            'Some of these providers, such as Stripe, Google or Apple, also process data as independent controllers under their own policies.',
          ],
        },
        {
          heading: '5. Transfers outside the European Economic Area',
          body: [
            'Some providers may process data outside the European Economic Area, including in the United States. When that happens, the transfer must rely on an adequacy decision or on safeguards such as the European Commission’s standard contractual clauses. You can ask us for more information by email.',
          ],
        },
        {
          heading: '6. How long we keep it',
          body: [
            [
              'Account data, vehicles and spaces: while you have an account.',
              'When you delete your account: we erase or anonymize your personal data, except what we must keep by law or to defend claims.',
              'Booking, payment and credit records: kept without your name or email for the period required by accounting and tax rules (in Italy, generally 10 years). Stripe keeps its own records.',
              'Support messages: for as long as needed to resolve them and evidence our reply.',
              'Technical logs and backups: for a limited period.',
            ],
          ],
        },
        {
          heading: '7. Your rights',
          body: [
            `You can request access, rectification, erasure, restriction, portability or objection, and withdraw your consent, by writing to ${email}. We reply within the legal deadline, generally one month.`,
            'You can edit your profile and delete your account in the app. You can also complain to your data protection authority; in Italy, the Garante per la protezione dei dati personali (www.garanteprivacy.it).',
          ],
        },
        {
          heading: '8. Security',
          body: [
            'We use encrypted connections, passwords protected with an irreversible algorithm, sessions that expire and limits on sign-in attempts. No system is completely secure: if you notice a problem, write to us.',
          ],
        },
        {
          heading: '9. Minors',
          body: [
            'GarageApp is for people aged 18 or over. If you believe a minor has given us their data, write to us and we will delete it.',
          ],
        },
        {
          heading: '10. Changes',
          body: [
            'If we change this policy we will update the date on this page and give notice of important changes.',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms and Conditions',
      sections: [
        {
          heading: '1. Who we are',
          body: [
            `GarageApp is operated by ${name}, at ${address}${vat ? `, tax number ${vat}` : ''}. Contact: ${email}. By creating an account or using the app you accept these terms.`,
          ],
        },
        {
          heading: '2. The service',
          body: [
            'GarageApp connects drivers with owners of parking spaces and handles the booking and the payment. Unless stated otherwise, the space is offered by its owner and GarageApp does not own or manage it. GarageApp does not provide vehicle custody.',
          ],
        },
        {
          heading: '3. Your account',
          body: [
            'You must be 18 or over, give accurate information and keep it up to date. You are responsible for protecting your access and telling us if someone uses it without permission.',
          ],
        },
        {
          heading: '4. Bookings',
          body: [
            [
              'The minimum duration is one hour.',
              'When you book, the space is held for 10 minutes while you pay. If it is not paid in time, the booking expires.',
              'The booking is confirmed when the payment is approved.',
              'The driver and the owner confirm the start in the app, from 10 minutes before the start time.',
              'You must use the space only during the booked time, with a vehicle that fits in it, and leave on time.',
            ],
          ],
        },
        {
          heading: '5. Prices and payments',
          body: [
            'The total price is shown before you pay. Card payments are processed by Stripe. If a charge is approved after the booking has expired or been cancelled, it is refunded to the same payment method.',
          ],
        },
        {
          heading: '6. Credits',
          body: [
            '100 credits are worth 1 USD and can only be used to pay for bookings in GarageApp. They cannot be transferred to other people or exchanged for money, except where the law requires it. For bookings in euros, the number of credits is shown before you pay.',
          ],
        },
        {
          heading: '7. Cancellations and refunds',
          body: [
            'You can cancel a booking that has not been paid yet at no cost. For now, the app does not allow cancelling a booking that has been paid.',
            `If the space was not available, did not match the listing or you had another problem, write to ${email} or use Support in the app, with the booking details. We review each case.`,
            'Nothing here limits the rights the law gives you as a consumer, including withdrawal and refund rights where they apply.',
          ],
        },
        {
          heading: '8. Owners',
          body: [
            [
              'You declare that you are entitled to offer the space and that you comply with the applicable rules, including tax rules, building rules and those in your contract.',
              'You must publish accurate information and photos, keep availability up to date and honor confirmed bookings.',
              'On card payments GarageApp keeps a commission of 10% of the price. The rest is transferred outside the app, by the method and within the time agreed with you.',
              'You keep the rights to your photos and texts and allow us to show them in GarageApp while they are published.',
            ],
          ],
        },
        {
          heading: '9. Acceptable use',
          body: [
            'You may not publish false, illegal or offensive content, impersonate others, use other users’ data for anything unrelated to the booking, avoid payments or harm the security of the service. You can report content by writing to us.',
            'We may remove content or suspend accounts that breach these terms or the law. Except in urgent cases or where the law forbids it, we will tell you the reason and you can ask for a review.',
          ],
        },
        {
          heading: '10. Liability',
          body: [
            'Each user is responsible for their actions and for the damage they cause. We work to keep the service running well but do not guarantee that it will always be available.',
            'To the extent the law allows, we are not liable for what other users do or for the condition of the spaces. We do not exclude liability for willful misconduct, gross negligence, personal injury or anything else the law does not allow to be excluded.',
          ],
        },
        {
          heading: '11. Deleting your account',
          body: [
            'You can delete your account at any time in Settings, provided you have no ongoing bookings or unused credits. In those cases, write to us.',
          ],
        },
        {
          heading: '12. Changes, governing law and complaints',
          body: [
            'We may change these terms and will give reasonable notice of important changes. Changes do not affect bookings that are already confirmed.',
            'The law of the country where the operator is established applies, without depriving you of the mandatory protection of the law of the country where you live. If you are a consumer, you can go to the courts of your place of residence where the law provides for it.',
            `Before starting a claim, please write to us at ${email}.`,
          ],
        },
      ],
    },
    'delete-account': {
      title: 'Delete your GarageApp account',
      sections: [
        {
          heading: 'In the app',
          body: [
            'Open GarageApp, go to Settings, tap “Delete account” and confirm. This cannot be undone.',
          ],
        },
        {
          heading: 'Without the app',
          body: [
            `Write to ${email} from the email of your account with the subject “Delete account”. We may ask you to confirm your identity.`,
          ],
        },
        {
          heading: 'What is deleted',
          body: [
            [
              'Your name, email, phone number, photo, password and link with Google.',
              'Your vehicles and notification identifiers.',
              'The details and photos of the spaces you published.',
              'We ask Stripe to delete your customer profile.',
            ],
          ],
        },
        {
          heading: 'What is kept',
          body: [
            'Booking, payment and credit records, without your name or email, for the period required by accounting and tax rules (in Italy, generally 10 years). Backups, technical logs and support messages may be kept for a limited period.',
          ],
        },
        {
          heading: 'Ongoing bookings or credits',
          body: [
            `If you have ongoing bookings, the app will ask you to wait until they end. If you have credits, you can use them or write to ${email} and we will sort it out so you can delete the account.`,
          ],
        },
      ],
    },
    support: {
      title: 'GarageApp Support',
      sections: [
        {
          body: [
            `Write to us at ${email}. If you have an account, you can also use Settings, Support.`,
            'For a problem with a booking, include the address of the space, the day and the time. Do not send your card details or your password.',
          ],
        },
        {
          heading: 'Service operator',
          body: [`${name}, ${address}${vat ? `, ${vat}` : ''}`],
        },
      ],
    },
  }),
};
