--
-- PostgreSQL database dump
--

\restrict ZrL8eUcQ0drmkPgPDLmh4c4A1Rwg84kRzH3bzneopceafuZKYAxQtPRhtANPEka

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ParkingStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ParkingStatus" AS ENUM (
    'AVAILABLE',
    'UNAVAILABLE',
    'MAINTENANCE'
);


--
-- Name: ParkingType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ParkingType" AS ENUM (
    'HOUSE',
    'BUILDING',
    'COMMERCIAL',
    'GARAGE'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: ReservationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReservationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED',
    'COMPLETED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: EmailVerificationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmailVerificationToken" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EmailVerificationToken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."EmailVerificationToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: EmailVerificationToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."EmailVerificationToken_id_seq" OWNED BY public."EmailVerificationToken".id;


--
-- Name: Favorite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Favorite" (
    "userId" integer NOT NULL,
    "parkingId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Parking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Parking" (
    id integer NOT NULL,
    "ownerId" integer NOT NULL,
    title text NOT NULL,
    description text,
    address text NOT NULL,
    city text NOT NULL,
    country text NOT NULL,
    latitude numeric(65,30) NOT NULL,
    longitude numeric(65,30) NOT NULL,
    "pricePerHour" numeric(65,30) NOT NULL,
    "pricePerDay" numeric(65,30),
    "maxHeight" numeric(65,30),
    "maxWidth" numeric(65,30),
    covered boolean DEFAULT false NOT NULL,
    "parkingStatus" public."ParkingStatus" DEFAULT 'AVAILABLE'::public."ParkingStatus" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "availableSince" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "parkingType" public."ParkingType" NOT NULL
);


--
-- Name: ParkingPhoto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ParkingPhoto" (
    id integer NOT NULL,
    "parkingId" integer NOT NULL,
    "imageUrl" text NOT NULL,
    "displayOrder" integer,
    "isCover" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ParkingPhoto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ParkingPhoto_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ParkingPhoto_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ParkingPhoto_id_seq" OWNED BY public."ParkingPhoto".id;


--
-- Name: Parking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Parking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Parking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Parking_id_seq" OWNED BY public."Parking".id;


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id integer NOT NULL,
    "reservationId" integer NOT NULL,
    "payerUserId" integer NOT NULL,
    amount numeric(65,30) NOT NULL,
    currency text NOT NULL,
    commission numeric(65,30) NOT NULL,
    "ownerAmount" numeric(65,30) NOT NULL,
    "paymentMethod" text NOT NULL,
    "transactionId" text,
    "stripePaymentIntentId" text NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Payment_id_seq" OWNED BY public."Payment".id;


--
-- Name: Reservation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Reservation" (
    id integer NOT NULL,
    "parkingId" integer NOT NULL,
    "userId" integer NOT NULL,
    "vehicleId" integer,
    "startDatetime" timestamp(3) without time zone NOT NULL,
    "endDatetime" timestamp(3) without time zone NOT NULL,
    "totalPrice" numeric(65,30) NOT NULL,
    status public."ReservationStatus" DEFAULT 'PENDING'::public."ReservationStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Reservation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Reservation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Reservation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Reservation_id_seq" OWNED BY public."Reservation".id;


--
-- Name: Review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Review" (
    id integer NOT NULL,
    "parkingId" integer NOT NULL,
    "userId" integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Review_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Review_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Review_id_seq" OWNED BY public."Review".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text NOT NULL,
    password text,
    phone text,
    "profileImage" text,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stripeCustomerId" text,
    "googleId" text
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: Vehicle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Vehicle" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "licensePlate" text NOT NULL,
    brand text,
    model text,
    color text,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Vehicle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Vehicle_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Vehicle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Vehicle_id_seq" OWNED BY public."Vehicle".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: EmailVerificationToken id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailVerificationToken" ALTER COLUMN id SET DEFAULT nextval('public."EmailVerificationToken_id_seq"'::regclass);


--
-- Name: Parking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Parking" ALTER COLUMN id SET DEFAULT nextval('public."Parking_id_seq"'::regclass);


--
-- Name: ParkingPhoto id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ParkingPhoto" ALTER COLUMN id SET DEFAULT nextval('public."ParkingPhoto_id_seq"'::regclass);


--
-- Name: Payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN id SET DEFAULT nextval('public."Payment_id_seq"'::regclass);


--
-- Name: Reservation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation" ALTER COLUMN id SET DEFAULT nextval('public."Reservation_id_seq"'::regclass);


--
-- Name: Review id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review" ALTER COLUMN id SET DEFAULT nextval('public."Review_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: Vehicle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vehicle" ALTER COLUMN id SET DEFAULT nextval('public."Vehicle_id_seq"'::regclass);


--
-- Data for Name: EmailVerificationToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmailVerificationToken" (id, "userId", "tokenHash", "expiresAt", "usedAt", "createdAt") FROM stdin;
1	3	fc9404641a172ed9b7c5b910718123bf2f206dfa386461fb3ff73daac99f5569	2026-09-05 19:35:11.8	\N	2026-09-04 19:35:11.807
\.


--
-- Data for Name: Favorite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Favorite" ("userId", "parkingId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Parking; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Parking" (id, "ownerId", title, description, address, city, country, latitude, longitude, "pricePerHour", "pricePerDay", "maxHeight", "maxWidth", covered, "parkingStatus", active, "availableSince", "createdAt", "updatedAt", "parkingType") FROM stdin;
2	1	Garage céntrico	Garage cubierto con fácil acceso	Av. Colón 1234	Mar del Plata	Argentina	-38.005500000000000000000000000000	-57.542600000000000000000000000000	1500.000000000000000000000000000000	8000.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	UNAVAILABLE	t	\N	2026-08-12 14:14:52.156	2026-08-12 14:14:52.156	GARAGE
3	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	UNAVAILABLE	t	\N	2026-08-12 14:15:56.496	2026-08-12 14:15:56.496	GARAGE
4	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	UNAVAILABLE	t	\N	2026-08-12 16:41:55.657	2026-08-12 16:41:55.657	GARAGE
8	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	UNAVAILABLE	t	\N	2026-08-13 14:16:27.402	2026-08-13 14:16:27.402	GARAGE
6	1	Garage Centro Torino	Garage coperto nel centro di Torino, accesso 24 ore	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	1111.000000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	UNAVAILABLE	t	\N	2026-08-12 17:20:03.376	2026-08-13 14:17:16.631	GARAGE
7	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	UNAVAILABLE	t	\N	2026-08-12 17:23:01.594	2026-08-13 14:17:22.002	GARAGE
9	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-13 17:53:26.63	2026-08-13 17:53:26.63	GARAGE
10	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 13:53:19.875	2026-08-17 13:53:19.875	GARAGE
11	1	Garage Centro Torino	Garage coperto nel centro di Torino, vicino a Piazza Castello	Via Roma 15	Torino	Italy	45.070300000000000000000000000000	7.686900000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 17:13:05.391	2026-08-17 17:13:05.391	GARAGE
12	1	Garage Piazza Vittorio	Garage coperto vicino a Piazza Vittorio Veneto e al fiume Po	Piazza Vittorio Veneto	Torino	Italy	45.064500000000000000000000000000	7.693000000000000000000000000000	3.000000000000000000000000000000	22.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 20:05:56.544	2026-08-17 20:05:56.544	GARAGE
13	1	Garage Porta Nuova	Garage coperto a pochi passi dalla stazione Torino Porta Nuova	Corso Vittorio Emanuele II 58	Torino	Italy	45.062600000000000000000000000000	7.679500000000000000000000000000	3.500000000000000000000000000000	25.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 20:06:05.228	2026-08-17 20:06:05.228	GARAGE
14	1	Garage Quadrilatero Romano	Garage coperto nel cuore del Quadrilatero Romano	Via Sant'Agostino 12	Torino	Italy	45.072800000000000000000000000000	7.680800000000000000000000000000	2.800000000000000000000000000000	20.000000000000000000000000000000	2.000000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 20:06:18.469	2026-08-17 20:06:18.469	GARAGE
15	1	Garage Parco Valentino	Garage coperto vicino al Parco del Valentino e al fiume Po	Corso Massimo d'Azeglio 15	Torino	Italy	45.057700000000000000000000000000	7.688600000000000000000000000000	2.500000000000000000000000000000	18.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 20:06:25.788	2026-08-17 20:06:25.788	GARAGE
16	1	Garage Porta Susa	Garage coperto vicino alla stazione Torino Porta Susa	Corso Inghilterra 25	Torino	Italy	45.070700000000000000000000000000	7.666000000000000000000000000000	3.000000000000000000000000000000	21.000000000000000000000000000000	2.100000000000000000000000000000	2.500000000000000000000000000000	t	AVAILABLE	t	\N	2026-08-17 20:06:31.407	2026-08-17 20:06:31.407	GARAGE
\.


--
-- Data for Name: ParkingPhoto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ParkingPhoto" (id, "parkingId", "imageUrl", "displayOrder", "isCover", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, "reservationId", "payerUserId", amount, currency, commission, "ownerAmount", "paymentMethod", "transactionId", "stripePaymentIntentId", status, "createdAt", "updatedAt") FROM stdin;
1	2	1	7.500000000000000000000000000000	EUR	0.750000000000000000000000000000	6.750000000000000000000000000000	STRIPE	\N	pi_3U4LpZBldy45b0u20dQvitYs	PENDING	2026-08-14 14:11:34.381	2026-08-14 14:11:34.381
2	4	1	7.500000000000000000000000000000	EUR	0.750000000000000000000000000000	6.750000000000000000000000000000	STRIPE	\N	pi_3U4RShBldy45b0u23wy60XdO	PENDING	2026-08-14 20:12:20.992	2026-08-14 20:12:20.992
3	5	1	7.500000000000000000000000000000	EUR	0.750000000000000000000000000000	6.750000000000000000000000000000	STRIPE	\N	pi_3U5QwtBldy45b0u20C7ChCTq	SUCCEEDED	2026-08-17 13:51:36.287	2026-08-17 13:52:30.819
4	6	1	7.500000000000000000000000000000	EUR	0.750000000000000000000000000000	6.750000000000000000000000000000	STRIPE	\N	pi_3U5QyqBldy45b0u21YTxEwz2	SUCCEEDED	2026-08-17 13:53:37.138	2026-08-17 13:54:11.485
5	7	1	7.500000000000000000000000000000	EUR	0.750000000000000000000000000000	6.750000000000000000000000000000	STRIPE	\N	pi_3U5U6WBldy45b0u20hLBg4NJ	FAILED	2026-08-17 17:13:45.518	2026-08-17 17:14:54.031
6	12	1	2.800000000000000000000000000000	EUR	0.280000000000000000000000000000	2.520000000000000000000000000000	STRIPE	\N	pi_3U8hKKBldy45b0u22plj38t5	PENDING	2026-08-26 13:57:18.509	2026-08-26 13:57:18.509
7	13	1	2.800000000000000000000000000000	EUR	0.280000000000000000000000000000	2.520000000000000000000000000000	STRIPE	\N	pi_3U8hPHBldy45b0u21HnMEJyT	PENDING	2026-08-26 14:02:25.768	2026-08-26 14:02:25.768
8	14	1	2.500000000000000000000000000000	EUR	0.250000000000000000000000000000	2.250000000000000000000000000000	STRIPE	\N	pi_3U8hR2Bldy45b0u22axFE6LJ	PENDING	2026-08-26 14:04:14.144	2026-08-26 14:04:14.144
9	15	1	2.500000000000000000000000000000	EUR	0.250000000000000000000000000000	2.250000000000000000000000000000	STRIPE	\N	pi_3U8k8SBldy45b0u22hvmhjnL	PENDING	2026-08-26 16:57:12.66	2026-08-26 16:57:12.66
10	16	1	3.500000000000000000000000000000	EUR	0.350000000000000000000000000000	3.150000000000000000000000000000	STRIPE	\N	pi_3U8k8oBldy45b0u21B5itLcd	PENDING	2026-08-26 16:57:35.341	2026-08-26 16:57:35.341
11	17	1	2.500000000000000000000000000000	EUR	0.250000000000000000000000000000	2.250000000000000000000000000000	STRIPE	\N	pi_3U95xkBldy45b0u21IeHh2Vj	PENDING	2026-08-27 16:15:38.369	2026-08-27 16:15:38.369
12	18	1	2.500000000000000000000000000000	EUR	0.250000000000000000000000000000	2.250000000000000000000000000000	STRIPE	\N	pi_3U9TWIBldy45b0u21PUVY4FO	PENDING	2026-08-28 17:24:51.288	2026-08-28 17:24:51.288
13	19	1	2.500000000000000000000000000000	EUR	0.250000000000000000000000000000	2.250000000000000000000000000000	STRIPE	\N	pi_3U9TsyBldy45b0u203Z9yJub	PENDING	2026-08-28 17:48:17.132	2026-08-28 17:48:17.132
14	20	1	3.500000000000000000000000000000	EUR	0.350000000000000000000000000000	3.150000000000000000000000000000	STRIPE	\N	pi_3U9WcgBldy45b0u23SwyFAPb	PENDING	2026-08-28 20:43:38.739	2026-08-28 20:43:38.739
\.


--
-- Data for Name: Reservation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Reservation" (id, "parkingId", "userId", "vehicleId", "startDatetime", "endDatetime", "totalPrice", status, "expiresAt", "createdAt", "updatedAt") FROM stdin;
1	9	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	CANCELLED	2026-08-13 18:05:12.224	2026-08-13 17:55:12.238	2026-08-13 17:59:29.701
2	9	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	EXPIRED	2026-08-14 14:18:42.071	2026-08-14 14:08:42.096	2026-08-14 19:45:41.225
3	9	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	EXPIRED	2026-08-14 19:56:23.103	2026-08-14 19:46:23.219	2026-08-14 20:10:10.959
4	9	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	EXPIRED	2026-08-14 20:21:54.135	2026-08-14 20:11:54.3	2026-08-17 13:48:23.209
5	9	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	CONFIRMED	2026-08-17 13:58:47.531	2026-08-17 13:48:47.565	2026-08-17 13:52:30.819
6	10	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	CONFIRMED	2026-08-17 14:03:25.739	2026-08-17 13:53:25.746	2026-08-17 13:54:11.485
7	11	1	1	2026-08-15 10:00:00	2026-08-15 13:00:00	7.500000000000000000000000000000	EXPIRED	2026-08-17 17:23:21.629	2026-08-17 17:13:21.636	2026-08-21 17:28:11.954
10	16	1	1	2026-08-26 13:54:00	2026-08-26 14:54:00	3.000000000000000000000000000000	PENDING	2026-08-26 14:05:05.426	2026-08-26 13:55:05.448	2026-08-26 13:55:05.448
11	12	1	1	2026-08-26 13:54:00	2026-08-26 14:54:00	3.000000000000000000000000000000	PENDING	2026-08-26 14:06:06.882	2026-08-26 13:56:06.887	2026-08-26 13:56:06.887
9	14	1	1	2026-08-25 10:00:00	2026-08-25 14:00:00	11.200000000000000000000000000000	EXPIRED	2026-08-21 17:39:14.528	2026-08-21 17:29:14.539	2026-08-26 13:57:12.257
12	14	1	1	2026-08-26 13:56:00	2026-08-26 14:56:00	2.800000000000000000000000000000	PENDING	2026-08-26 14:07:12.256	2026-08-26 13:57:12.266	2026-08-26 13:57:12.266
13	14	1	1	2026-08-29 14:00:00	2026-08-29 15:00:00	2.800000000000000000000000000000	PENDING	2026-08-26 14:12:24.701	2026-08-26 14:02:24.708	2026-08-26 14:02:24.708
8	11	1	1	2026-08-25 10:00:00	2026-08-25 14:00:00	10.000000000000000000000000000000	EXPIRED	2026-08-21 17:38:11.95	2026-08-21 17:28:12.038	2026-08-26 14:04:13.118
14	11	1	1	2026-08-26 14:03:00	2026-08-26 15:03:00	2.500000000000000000000000000000	EXPIRED	2026-08-26 14:14:13.117	2026-08-26 14:04:13.125	2026-08-26 16:57:11.664
17	15	1	1	2026-08-27 16:14:00	2026-08-27 17:14:00	2.500000000000000000000000000000	PENDING	2026-08-27 16:25:37.014	2026-08-27 16:15:37.045	2026-08-27 16:15:37.045
15	11	1	1	2026-08-26 16:56:00	2026-08-26 17:56:00	2.500000000000000000000000000000	EXPIRED	2026-08-26 17:07:11.662	2026-08-26 16:57:11.679	2026-08-28 17:24:50.12
18	11	1	1	2026-08-28 17:24:00	2026-08-28 18:24:00	2.500000000000000000000000000000	PENDING	2026-08-28 17:34:50.119	2026-08-28 17:24:50.15	2026-08-28 17:24:50.15
16	13	1	1	2026-08-26 16:56:00	2026-08-26 17:56:00	3.500000000000000000000000000000	EXPIRED	2026-08-26 17:07:34.91	2026-08-26 16:57:34.915	2026-08-28 20:43:37.603
20	13	1	1	2026-08-28 20:42:00	2026-08-28 21:42:00	3.500000000000000000000000000000	PENDING	2026-08-28 20:53:37.601	2026-08-28 20:43:37.62	2026-08-28 20:43:37.62
19	10	1	1	2026-08-28 17:47:00	2026-08-28 18:47:00	2.500000000000000000000000000000	EXPIRED	2026-08-28 17:58:16.138	2026-08-28 17:48:16.144	2026-09-04 19:25:39.056
21	10	1	1	2026-09-04 19:25:00	2026-09-04 20:25:00	2.500000000000000000000000000000	PENDING	2026-09-04 19:35:39.055	2026-09-04 19:25:39.088	2026-09-04 19:25:39.088
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Review" (id, "parkingId", "userId", rating, comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "firstName", "lastName", email, password, phone, "profileImage", "emailVerified", "isAdmin", "createdAt", "updatedAt", "stripeCustomerId", "googleId") FROM stdin;
2	Ramiro	Martinez	ramirotro@test.com	$2b$12$lwS1drwjciQdsy/Q.sIOBuNrbL5/N4ZsgJD3qVi1kHzYcjATaD6O2	+5492230000000	\N	f	f	2026-08-12 17:21:19.756	2026-08-12 17:21:19.756	\N	\N
1	Ramiro	Martinez	ramiro@test.com	$2b$12$i/g9LoVFX0gMCB7b3blS1OLewBpkFZb/i/ggurW3WM42tf1xp2tJq	+5492230000000	\N	f	f	2026-08-12 14:14:28.291	2026-08-13 19:09:13.396	cus_V4COuHKoNvFxXE	\N
3	Ramón	Martínez	mpuppyprod@gmail.com	$2b$12$mNpb8umcekJDwNRo4Rgwo.7J1BeLzQUzybV.xFOBfw76Cd9hpY0IS	+5492236681800	\N	f	f	2026-09-04 19:35:11.795	2026-09-04 19:35:11.795	\N	\N
\.


--
-- Data for Name: Vehicle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Vehicle" (id, "userId", "licensePlate", brand, model, color, "isDefault", "createdAt", "updatedAt") FROM stdin;
1	1	AB123CD	Fiat	Cronos	Gris	f	2026-08-13 17:55:06.936	2026-08-13 17:55:06.936
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
bd41f2ac-826a-4262-9b7e-0b1bffcf1ec6	cb8b1b34443b1b74c618b52e6207861782bb24a129b810904a072d183a43a275	2026-08-12 14:11:33.134174+00	20260807184354_init	\N	\N	2026-08-12 14:11:33.050214+00	1
30b34141-65a6-4cad-ae1b-cde4183e13ab	0d195c847afbe8ec27d28a619953bc8a072a0da3cd68f8e7379c01b70c5df32b	2026-08-12 14:11:33.146009+00	20260811192725_remove_unique_license_plate	\N	\N	2026-08-12 14:11:33.137265+00	1
cba7ad59-be62-43de-8e6b-640a5b3c7123	a18eb9cb9edb8dc1b3443b20ed58ece85aa10be91d9383d5c62fae011066f148	2026-08-12 14:11:33.167336+00	20260812141100_add_parking_type	\N	\N	2026-08-12 14:11:33.148796+00	1
5cad5473-41b3-4b5c-acbb-26134ae827c4	e4fdb0a4d13090c6df30051cf01fc3497a34225f4ca6a6113ec403bde06a78d6	2026-08-13 17:50:36.913051+00	20260813175036_parking_available_default	\N	\N	2026-08-13 17:50:36.813226+00	1
e5b98b08-54cc-4427-8921-91e94e936527	c68cc8468ccec54132170cb8d1bfca1da76df3a52f493d7f99862280840fd7d5	2026-08-13 19:07:25.392222+00	20260813190725_add_stripe_customer	\N	\N	2026-08-13 19:07:25.359547+00	1
27bbdaf8-dc1d-410d-874b-388b1b4be93a	3bcca68f9f18ba27afd961129746d569fd2264d0196d4bdd244c9d8d53231678	2026-08-17 13:51:19.071561+00	20260817135119_add_unique_stripe_payment_intent	\N	\N	2026-08-17 13:51:19.044684+00	1
a3815c55-202c-43b5-97e8-226f2008b040	cdce3f59f053e7e5319bd1b23495b829cd15bfe8de065275f2b0508770c70634	2026-09-04 19:33:15.985455+00	20260904120000_add_auth_verification_and_google	\N	\N	2026-09-04 19:33:15.938008+00	1
\.


--
-- Name: EmailVerificationToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."EmailVerificationToken_id_seq"', 1, true);


--
-- Name: ParkingPhoto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ParkingPhoto_id_seq"', 1, false);


--
-- Name: Parking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Parking_id_seq"', 16, true);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 14, true);


--
-- Name: Reservation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Reservation_id_seq"', 21, true);


--
-- Name: Review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Review_id_seq"', 1, false);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 3, true);


--
-- Name: Vehicle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Vehicle_id_seq"', 1, true);


--
-- Name: EmailVerificationToken EmailVerificationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY (id);


--
-- Name: Favorite Favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "parkingId");


--
-- Name: ParkingPhoto ParkingPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ParkingPhoto"
    ADD CONSTRAINT "ParkingPhoto_pkey" PRIMARY KEY (id);


--
-- Name: Parking Parking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Parking"
    ADD CONSTRAINT "Parking_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Reservation Reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vehicle Vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: EmailVerificationToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON public."EmailVerificationToken" USING btree ("tokenHash");


--
-- Name: EmailVerificationToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmailVerificationToken_userId_idx" ON public."EmailVerificationToken" USING btree ("userId");


--
-- Name: Payment_reservationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_reservationId_key" ON public."Payment" USING btree ("reservationId");


--
-- Name: Payment_stripePaymentIntentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON public."Payment" USING btree ("stripePaymentIntentId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId");


--
-- Name: User_stripeCustomerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON public."User" USING btree ("stripeCustomerId");


--
-- Name: EmailVerificationToken EmailVerificationToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_parkingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_parkingId_fkey" FOREIGN KEY ("parkingId") REFERENCES public."Parking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Favorite Favorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ParkingPhoto ParkingPhoto_parkingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ParkingPhoto"
    ADD CONSTRAINT "ParkingPhoto_parkingId_fkey" FOREIGN KEY ("parkingId") REFERENCES public."Parking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Parking Parking_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Parking"
    ADD CONSTRAINT "Parking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_payerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_reservationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES public."Reservation"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_parkingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_parkingId_fkey" FOREIGN KEY ("parkingId") REFERENCES public."Parking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Reservation Reservation_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Reservation"
    ADD CONSTRAINT "Reservation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Review Review_parkingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_parkingId_fkey" FOREIGN KEY ("parkingId") REFERENCES public."Parking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vehicle Vehicle_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict ZrL8eUcQ0drmkPgPDLmh4c4A1Rwg84kRzH3bzneopceafuZKYAxQtPRhtANPEka

