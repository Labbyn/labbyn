--
-- PostgreSQL database dump
--

\restrict 8OE8yga68XbnqKpTsUyjy3EjIi3kFfQ4ZJTriwJoxOYhSiSzr4L6l8E17nQYfva

-- Dumped from database version 17.10 (Debian 17.10-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: action_type_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.action_type_enum AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public.action_type_enum OWNER TO admin;

--
-- Name: entity_type_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.entity_type_enum AS ENUM (
    'MACHINES',
    'INVENTORY',
    'ROOM',
    'USER',
    'CATEGORIES'
);


ALTER TYPE public.entity_type_enum OWNER TO admin;

--
-- Name: user_type_enum; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.user_type_enum AS ENUM (
    'ADMIN',
    'GROUP_ADMIN',
    'USER'
);


ALTER TYPE public.user_type_enum OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_tokens; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.access_tokens (
    user_id integer NOT NULL,
    token character varying(43) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.access_tokens OWNER TO admin;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO admin;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public.categories OWNER TO admin;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO admin;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: cpus; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.cpus (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    machine_id integer NOT NULL
);


ALTER TABLE public.cpus OWNER TO admin;

--
-- Name: cpus_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.cpus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cpus_id_seq OWNER TO admin;

--
-- Name: cpus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.cpus_id_seq OWNED BY public.cpus.id;


--
-- Name: disks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.disks (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    capacity character varying(50),
    machine_id integer NOT NULL
);


ALTER TABLE public.disks OWNER TO admin;

--
-- Name: disks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.disks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disks_id_seq OWNER TO admin;

--
-- Name: disks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.disks_id_seq OWNED BY public.disks.id;


--
-- Name: documentation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.documentation (
    id integer NOT NULL,
    title character varying(50) NOT NULL,
    author character varying(50) NOT NULL,
    content character varying(5000),
    added_on timestamp without time zone NOT NULL,
    modified_on timestamp without time zone,
    version_id integer NOT NULL
);


ALTER TABLE public.documentation OWNER TO admin;

--
-- Name: documentation_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.documentation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documentation_id_seq OWNER TO admin;

--
-- Name: documentation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.documentation_id_seq OWNED BY public.documentation.id;


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.equipment (
    id integer NOT NULL,
    eq_type character varying(50) NOT NULL,
    name character varying(50),
    map_id integer NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    label character varying(30),
    rotation double precision,
    color character varying(20),
    rack_id integer
);


ALTER TABLE public.equipment OWNER TO admin;

--
-- Name: equipment_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.equipment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_id_seq OWNER TO admin;

--
-- Name: equipment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.equipment_id_seq OWNED BY public.equipment.id;


--
-- Name: history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.history (
    id integer NOT NULL,
    entity_type public.entity_type_enum NOT NULL,
    action public.action_type_enum NOT NULL,
    entity_id integer NOT NULL,
    user_id integer,
    "timestamp" timestamp with time zone DEFAULT now(),
    before_state jsonb,
    after_state jsonb,
    can_rollback boolean,
    extra_data jsonb
);


ALTER TABLE public.history OWNER TO admin;

--
-- Name: history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.history_id_seq OWNER TO admin;

--
-- Name: history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.history_id_seq OWNED BY public.history.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    quantity integer NOT NULL,
    team_id integer,
    localization_id integer NOT NULL,
    category_id integer NOT NULL,
    rental_status boolean NOT NULL,
    rental_id integer,
    version_id integer NOT NULL,
    machine_id integer
);


ALTER TABLE public.inventory OWNER TO admin;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO admin;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: machines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.machines (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    localization_id integer NOT NULL,
    mac_address character varying(17),
    ip_address character varying(15),
    pdu_port integer,
    team_id integer,
    os character varying(30),
    serial_number character varying(50),
    note character varying(500),
    added_on timestamp without time zone NOT NULL,
    ram character varying(100),
    metadata_id integer NOT NULL,
    shelf_id integer,
    version_id integer NOT NULL
);


ALTER TABLE public.machines OWNER TO admin;

--
-- Name: machines_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.machines_id_seq OWNER TO admin;

--
-- Name: machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.machines_id_seq OWNED BY public.machines.id;


--
-- Name: map_labels; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.map_labels (
    id integer NOT NULL,
    map_id integer NOT NULL,
    name character varying(50) NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    color character varying(50) NOT NULL
);


ALTER TABLE public.map_labels OWNER TO admin;

--
-- Name: map_labels_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.map_labels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.map_labels_id_seq OWNER TO admin;

--
-- Name: map_labels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.map_labels_id_seq OWNED BY public.map_labels.id;


--
-- Name: maps; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.maps (
    id integer NOT NULL,
    room_id integer
);


ALTER TABLE public.maps OWNER TO admin;

--
-- Name: maps_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.maps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maps_id_seq OWNER TO admin;

--
-- Name: maps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.maps_id_seq OWNED BY public.maps.id;


--
-- Name: metadata; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.metadata (
    id integer NOT NULL,
    last_update date,
    agent_prometheus boolean,
    ansible_access boolean,
    ansible_root_access boolean,
    version_id integer NOT NULL
);


ALTER TABLE public.metadata OWNER TO admin;

--
-- Name: metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metadata_id_seq OWNER TO admin;

--
-- Name: metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.metadata_id_seq OWNED BY public.metadata.id;


--
-- Name: racks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.racks (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    room_id integer NOT NULL,
    team_id integer,
    version_id integer NOT NULL
);


ALTER TABLE public.racks OWNER TO admin;

--
-- Name: racks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.racks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.racks_id_seq OWNER TO admin;

--
-- Name: racks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.racks_id_seq OWNED BY public.racks.id;


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.rentals (
    id integer NOT NULL,
    item_id integer NOT NULL,
    team_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    user_id integer NOT NULL,
    quantity integer NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public.rentals OWNER TO admin;

--
-- Name: rentals_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.rentals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rentals_id_seq OWNER TO admin;

--
-- Name: rentals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.rentals_id_seq OWNED BY public.rentals.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    room_type character varying(100),
    team_id integer,
    version_id integer NOT NULL
);


ALTER TABLE public.rooms OWNER TO admin;

--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rooms_id_seq OWNER TO admin;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: shelves; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.shelves (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    rack_id integer NOT NULL,
    "order" integer NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public.shelves OWNER TO admin;

--
-- Name: shelves_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.shelves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shelves_id_seq OWNER TO admin;

--
-- Name: shelves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.shelves_id_seq OWNED BY public.shelves.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(50) NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public.tags OWNER TO admin;

--
-- Name: tags_documentation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tags_documentation (
    id integer NOT NULL,
    documentation_id integer,
    tag_id integer
);


ALTER TABLE public.tags_documentation OWNER TO admin;

--
-- Name: tags_documentation_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.tags_documentation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_documentation_id_seq OWNER TO admin;

--
-- Name: tags_documentation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.tags_documentation_id_seq OWNED BY public.tags_documentation.id;


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_id_seq OWNER TO admin;

--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: tags_machines; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tags_machines (
    id integer NOT NULL,
    machine_id integer,
    tag_id integer
);


ALTER TABLE public.tags_machines OWNER TO admin;

--
-- Name: tags_machines_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.tags_machines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_machines_id_seq OWNER TO admin;

--
-- Name: tags_machines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.tags_machines_id_seq OWNED BY public.tags_machines.id;


--
-- Name: tags_racks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tags_racks (
    id integer NOT NULL,
    rack_id integer,
    tag_id integer
);


ALTER TABLE public.tags_racks OWNER TO admin;

--
-- Name: tags_racks_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.tags_racks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_racks_id_seq OWNER TO admin;

--
-- Name: tags_racks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.tags_racks_id_seq OWNED BY public.tags_racks.id;


--
-- Name: tags_rooms; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tags_rooms (
    id integer NOT NULL,
    room_id integer,
    tag_id integer
);


ALTER TABLE public.tags_rooms OWNER TO admin;

--
-- Name: tags_rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.tags_rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_rooms_id_seq OWNER TO admin;

--
-- Name: tags_rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.tags_rooms_id_seq OWNED BY public.tags_rooms.id;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.teams (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public.teams OWNER TO admin;

--
-- Name: teams_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_id_seq OWNER TO admin;

--
-- Name: teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.teams_id_seq OWNED BY public.teams.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    surname character varying(80) NOT NULL,
    login character varying(30) NOT NULL,
    email character varying(100) NOT NULL,
    avatar_path character varying(255),
    hashed_password character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    is_superuser boolean NOT NULL,
    is_verified boolean NOT NULL,
    user_type public.user_type_enum NOT NULL,
    force_password_change boolean NOT NULL,
    version_id integer NOT NULL
);


ALTER TABLE public."user" OWNER TO admin;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO admin;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: users_teams; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users_teams (
    id integer NOT NULL,
    user_id integer,
    team_id integer,
    is_group_admin boolean NOT NULL
);


ALTER TABLE public.users_teams OWNER TO admin;

--
-- Name: users_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.users_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_teams_id_seq OWNER TO admin;

--
-- Name: users_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.users_teams_id_seq OWNED BY public.users_teams.id;


--
-- Name: wall_segments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.wall_segments (
    id integer NOT NULL,
    map_id integer NOT NULL,
    name character varying(50),
    node1_id integer,
    node2_id integer,
    node1_name character varying(100),
    node2_name character varying(100)
);


ALTER TABLE public.wall_segments OWNER TO admin;

--
-- Name: wall_segments_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.wall_segments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wall_segments_id_seq OWNER TO admin;

--
-- Name: wall_segments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.wall_segments_id_seq OWNED BY public.wall_segments.id;


--
-- Name: walls_nodes; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.walls_nodes (
    id integer NOT NULL,
    map_id integer NOT NULL,
    name character varying(50),
    x double precision NOT NULL,
    y double precision NOT NULL
);


ALTER TABLE public.walls_nodes OWNER TO admin;

--
-- Name: walls_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.walls_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.walls_nodes_id_seq OWNER TO admin;

--
-- Name: walls_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.walls_nodes_id_seq OWNED BY public.walls_nodes.id;


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: cpus id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.cpus ALTER COLUMN id SET DEFAULT nextval('public.cpus_id_seq'::regclass);


--
-- Name: disks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.disks ALTER COLUMN id SET DEFAULT nextval('public.disks_id_seq'::regclass);


--
-- Name: documentation id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.documentation ALTER COLUMN id SET DEFAULT nextval('public.documentation_id_seq'::regclass);


--
-- Name: equipment id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.equipment ALTER COLUMN id SET DEFAULT nextval('public.equipment_id_seq'::regclass);


--
-- Name: history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.history ALTER COLUMN id SET DEFAULT nextval('public.history_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: machines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines ALTER COLUMN id SET DEFAULT nextval('public.machines_id_seq'::regclass);


--
-- Name: map_labels id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.map_labels ALTER COLUMN id SET DEFAULT nextval('public.map_labels_id_seq'::regclass);


--
-- Name: maps id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maps ALTER COLUMN id SET DEFAULT nextval('public.maps_id_seq'::regclass);


--
-- Name: metadata id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.metadata ALTER COLUMN id SET DEFAULT nextval('public.metadata_id_seq'::regclass);


--
-- Name: racks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.racks ALTER COLUMN id SET DEFAULT nextval('public.racks_id_seq'::regclass);


--
-- Name: rentals id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rentals ALTER COLUMN id SET DEFAULT nextval('public.rentals_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: shelves id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shelves ALTER COLUMN id SET DEFAULT nextval('public.shelves_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: tags_documentation id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_documentation ALTER COLUMN id SET DEFAULT nextval('public.tags_documentation_id_seq'::regclass);


--
-- Name: tags_machines id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_machines ALTER COLUMN id SET DEFAULT nextval('public.tags_machines_id_seq'::regclass);


--
-- Name: tags_racks id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_racks ALTER COLUMN id SET DEFAULT nextval('public.tags_racks_id_seq'::regclass);


--
-- Name: tags_rooms id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_rooms ALTER COLUMN id SET DEFAULT nextval('public.tags_rooms_id_seq'::regclass);


--
-- Name: teams id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams ALTER COLUMN id SET DEFAULT nextval('public.teams_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: users_teams id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users_teams ALTER COLUMN id SET DEFAULT nextval('public.users_teams_id_seq'::regclass);


--
-- Name: wall_segments id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wall_segments ALTER COLUMN id SET DEFAULT nextval('public.wall_segments_id_seq'::regclass);


--
-- Name: walls_nodes id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.walls_nodes ALTER COLUMN id SET DEFAULT nextval('public.walls_nodes_id_seq'::regclass);


--
-- Data for Name: access_tokens; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.access_tokens (user_id, token, created_at) FROM stdin;
2	V4X-0b-UyR5H4aGZ_7-E181nDxL0HiEzMHix1vLZG24	2026-07-07 20:07:27.858756+00
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.alembic_version (version_num) FROM stdin;
97e6ab8daabd
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.categories (id, name, version_id) FROM stdin;
1	Kable USB	1
2	Kable Sieciowe	1
3	Kable Zasilające	1
4	Adaptery	1
5	Myszki	1
6	Klawiatury	1
\.


--
-- Data for Name: cpus; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.cpus (id, name, machine_id) FROM stdin;
1	Intel i5-10600KF	1
2	Intel Xeon	2
3	Intel i5-10600KF	3
4	Intel Xeon Gold 6244	4
5	Intel Xeon Silver 4210	5
6	Intel Xeon Silver 4210	6
7	Intel Xeon Silver 4210	7
8	AMD EPYC 9654	8
9	AMD EPYC 9654	9
10	Intel Xeon E-2300	10
11	Intel Xeon E-2300	11
12	Intel Xeon E-2300	12
13	Intel Xeon E-2388G	13
14	Intel Xeon Silver 4310	14
15	AMD EPYC 7232P	15
16	Intel Xeon Gold 6330	16
17	Intel Xeon Gold 5318Y	17
18	Intel Xeon E-2336	18
19	Intel Xeon Platinum 8358	19
20	AMD EPYC 7543	20
21	Intel Xeon Gold 5318Y	21
\.


--
-- Data for Name: disks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.disks (id, name, capacity, machine_id) FROM stdin;
1	Samsung SSD	1024	1
2	Samsung SSD	512	2
3	Samsung SSD	512	3
4	Samsung SSD	512	3
5	Samsung	1024	4
6	Samsung	512	5
7	Samsung	256	6
8	Samsung	512	7
9	ADATA	512	8
10	ADATA	256	9
11	Samsung	256	10
12	ADATA	512	11
13	ADATA	512	12
14	Samsung PM883	480	13
15	Kingston DC600M	960	14
16	Crucial MX500	500	15
17	Samsung PM9A3	2048	16
18	Seagate Exos X18	4096	17
19	Western Digital Ultrastar DC HC550	8 192	18
20	KIOXIA CM6	4096	19
21	Samsung PM1733	1024	20
22	Seagate Exos X18	4096	21
\.


--
-- Data for Name: documentation; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.documentation (id, title, author, content, added_on, modified_on, version_id) FROM stdin;
1	labbyn	anonymous admin	# Labbyn\n\nLabbyn is an application for your datacenter, laboratory or homelab. \nYou can monitor your infrastructure, set the location of each server \nor platform on an interactive dashboard, \nstore information about your assets in an inventory and more. \nEverything runs on a modern GUI, \nis deployable on most Linux machines and is **OPEN SOURCE**.\n\n## Installation\n\nTo install you only need docker  and docker compose.\nExample of Debian installation:\n```bash\napt update\napt upgrade\napt install docker.io docker-compose\napt install -y docker-compose-plugin\n```\n### Application script\n\nInside the `scripts` directory there is an `app.sh` script \nthat can be used to manage your application.\n\n#### Arguments:\n- `deploy` - start/install app on your machine\n- `update` - rebuild application if nesscesary\n- `stop` - stop application container\n- `delete` - delete application\n- `--dev` - run application in development mode\n> [!IMPORTANT]\n> **If you use the `delete` argument entire application will be deleted \nincluding containers, images, volumes and networks**\n\n### Example:\n\nStart/Install application\n\n```bash\n./app.sh deploy\n```\n\nStop application\n\n```bash\n./app.sh stop\n```\n\nStart application in developement mode:\n```bash\n./app.sh deploy --dev\n```\n\n**PJATK 2025**:\ns26990, s26985, s27081, s27549	2026-07-01 12:41:00.51411	\N	1
2	Dokumentacja techniczna - Serwer aplikacyjny	Service	# Dokumentacja techniczna - Serwer aplikacyjny APP-01\n\n## Informacje podstawowe\n\n- **Nazwa hosta:** APP-SRV-01\n- **Adres IP:** 192.168.10.101\n- **System operacyjny:** Ubuntu 22.04 LTS\n- **CPU:** Intel Xeon E-2388G\n- **RAM:** 16 GB\n- **Dysk:** Samsung PM883 480 GB SSD\n\n## Opis\n\nSerwer APP-SRV-01 jest wykorzystywany do obsługi aplikacji wewnętrznych firmy.\nMaszyna pracuje w środowisku produkcyjnym i zapewnia dostępność usług aplikacyjnych.\nSystem jest monitorowany przez centralny system monitoringu infrastruktury.\nAktualizacje bezpieczeństwa wykonywane są zgodnie z harmonogramem utrzymania.\nKopia konfiguracji serwera wykonywana jest codziennie.	2026-07-07 22:05:57	2026-07-07 22:06:48	3
3	Switch CORE-01	Service	## Informacje podstawowe\n\n- **Nazwa urządzenia:** CORE-SW-01\n- **Model:** Cisco Catalyst 9300\n- **Lokalizacja:** Serwerownia główna\n- **Adres zarządzający:** 192.168.1.10\n- **Port uplink:** 10Gb SFP+\n\n## Opis\n\nUrządzenie pełni funkcję głównego przełącznika sieciowego w infrastrukturze LAN.\nSwitch obsługuje komunikację pomiędzy serwerami oraz urządzeniami końcowymi.\nKonfiguracja VLAN umożliwia separację ruchu sieciowego.\nDostęp administracyjny jest zabezpieczony poprzez SSH.\nKonfiguracja urządzenia jest archiwizowana po każdej zmianie.	2026-07-07 22:06:55	2026-07-07 22:07:09	2
5	Macierz STORAGE-01	akopczynski	## Informacje podstawowe\n\n- **Nazwa urządzenia:** STORAGE-01\n- **Producent:** Dell EMC\n- **Model:** PowerVault ME5024\n- **Pojemność:** 24 TB\n- **Typ dysków:** SSD SAS\n\n## Opis\n\nMacierz STORAGE-01 przechowuje dane maszyn wirtualnych oraz kopie zapasowe.\nUrządzenie pracuje w konfiguracji RAID 10 zapewniającej wysoką wydajność i redundancję.\nDostęp do zasobów realizowany jest poprzez protokół iSCSI.\nMonitoring stanu dysków odbywa się poprzez panel administracyjny producenta.\nW przypadku awarii dysku system automatycznie rozpoczyna proces odbudowy RAID.	2026-07-07 22:08:06	2026-07-07 22:08:20	2
4	Stacja robocza ADMIN-PC-01	akopczynski	## Informacje podstawowe\n\n- **Nazwa urządzenia:** ADMIN-PC-01\n- **System operacyjny:** Windows 11 Pro\n- **CPU:** Intel Core i7-13700\n- **RAM:** 32 GB\n- **Dysk:** Samsung 980 PRO 1 TB NVMe\n- **Adres IP:** 192.168.10.50\n\n## Opis\n\nStacja ADMIN-PC-01 przeznaczona jest dla administratorów infrastruktury IT.\nUrządzenie posiada dostęp do narzędzi zarządzania serwerami oraz urządzeniami sieciowymi.\nSystem posiada aktywne szyfrowanie dysku BitLocker.\nDostęp użytkownika wymaga uwierzytelniania wieloskładnikowego.\nOprogramowanie administracyjne jest aktualizowane wraz z cyklem aktualizacji systemu.	2026-07-07 22:08:04	2026-07-07 22:08:34	2
6	Wymiana dysku w serwerze	akopczynski	## Cel procedury\n\nProcedura opisuje sposób bezpiecznej wymiany uszkodzonego dysku w serwerze produkcyjnym.\n\n## Wymagane narzędzia\n\n- Dysk zgodny z konfiguracją serwera\n- Opaska antystatyczna ESD\n- Dokumentacja techniczna urządzenia\n\n## Przebieg czynności\n\n1. Zweryfikować awarię dysku w systemie monitoringu oraz panelu zarządzania serwerem.\n2. Zidentyfikować numer seryjny oraz lokalizację fizyczną uszkodzonego dysku.\n3. Potwierdzić możliwość wymiany dysku bez wyłączania systemu.\n4. Założyć opaskę antystatyczną przed rozpoczęciem pracy.\n5. Wyjąć uszkodzony dysk z zatoki serwera.\n6. Zamontować nowy dysk o identycznych lub zgodnych parametrach.\n7. Sprawdzić rozpoczęcie procesu odbudowy macierzy RAID.\n8. Zweryfikować poprawność działania po zakończeniu synchronizacji.\n\n## Kontrola końcowa\n\nPo wymianie należy zaktualizować dokumentację sprzętową oraz zamknąć zgłoszenie serwisowe.	2026-07-07 22:22:14	2026-07-07 22:22:36	2
7	Restart przełącznika sieciowego	akopczynski	## Cel procedury\n\nDokument opisuje bezpieczną procedurę restartu urządzenia sieciowego w serwerowni.\n\n## Przygotowanie\n\n- Potwierdzić zgłoszenie awarii lub zaplanowane okno serwisowe.\n- Wykonać kopię aktualnej konfiguracji urządzenia.\n- Poinformować użytkowników o możliwej przerwie w działaniu usług.\n\n## Przebieg czynności\n\n1. Połączyć się z urządzeniem poprzez SSH lub konsolę administracyjną.\n2. Sprawdzić aktywne połączenia oraz wykorzystanie portów.\n3. Zweryfikować dostępność urządzeń zapasowych.\n4. Wykonać kontrolowane wyłączenie urządzenia.\n5. Odczekać minimum 60 sekund przed ponownym uruchomieniem.\n6. Uruchomić urządzenie i obserwować proces inicjalizacji.\n7. Sprawdzić status interfejsów sieciowych.\n8. Zweryfikować komunikację z kluczowymi systemami.\n\n## Kontrola końcowa\n\nWyniki testów należy zapisać w raporcie serwisowym.	2026-07-07 22:22:40	2026-07-07 22:22:53	2
8	Czyszczenie serwerów i szaf RACK	akopczynski	## Cel procedury\n\nProcedura określa sposób wykonywania okresowego czyszczenia urządzeń w serwerowni.\n\n## Wymagane wyposażenie\n\n- Sprężone powietrze techniczne\n- Odkurzacz ESD\n- Środki czyszczące do elektroniki\n- Środki ochrony osobistej\n\n## Przebieg czynności\n\n1. Zaplanować prace podczas okna serwisowego.\n2. Sprawdzić temperaturę urządzeń przed rozpoczęciem prac.\n3. Wyłączyć urządzenia wymagające pełnego odłączenia zasilania.\n4. Usunąć kurz z filtrów wentylacyjnych oraz obudów.\n5. Oczyścić wentylatory i radiatory z nagromadzonych zabrudzeń.\n6. Sprawdzić drożność kanałów wentylacyjnych szafy RACK.\n7. Zamontować ponownie wszystkie elementy ochronne.\n8. Uruchomić urządzenia i sprawdzić temperatury pracy.\n\n## Kontrola końcowa\n\nNależy odnotować datę wykonania konserwacji oraz osobę wykonującą usługę.	2026-07-07 22:22:55	2026-07-07 22:23:06	2
9	Instalacja nowego serwera	akopczynski	## Cel procedury\n\nDokument opisuje proces fizycznego montażu oraz konfiguracji nowego serwera.\n\n## Przygotowanie\n\n- Zweryfikować dostępność miejsca w szafie RACK.\n- Przygotować przewody zasilające oraz sieciowe.\n- Nadać adresację IP zgodnie z planem infrastruktury.\n\n## Przebieg czynności\n\n1. Zamontować serwer w odpowiedniej jednostce RACK.\n2. Podłączyć przewody zasilające do właściwych portów PDU.\n3. Podłączyć interfejsy sieciowe do przełącznika.\n4. Uruchomić serwer i wejść do konfiguracji BIOS/iDRAC/iLO.\n5. Skonfigurować ustawienia sieciowe zarządzania.\n6. Zainstalować wymagany system operacyjny.\n7. Wprowadzić urządzenie do systemu monitoringu.\n8. Wykonać test obciążeniowy podstawowych komponentów.\n\n## Kontrola końcowa\n\nPo zakończeniu instalacji należy uzupełnić kartę sprzętu oraz dokumentację CMDB.	2026-07-07 22:23:14	2026-07-07 22:23:26	2
10	Wyłączenie serwerowni	akopczynski	## Cel procedury\n\nProcedura opisuje działania wykonywane podczas awarii wymagającej natychmiastowego odłączenia infrastruktury.\n\n## Przykładowe sytuacje\n\n- Pożar lub zadymienie\n- Awaria systemu UPS\n- Zalanie pomieszczenia technicznego\n- Zagrożenie bezpieczeństwa\n\n## Przebieg czynności\n\n1. Ocenić sytuację i określić poziom zagrożenia.\n2. Powiadomić osoby odpowiedzialne za infrastrukturę.\n3. Zatrzymać krytyczne usługi zgodnie z procedurą awaryjną.\n4. Wykonać kontrolowane wyłączenie serwerów, jeśli jest to możliwe.\n5. Odłączyć zasilanie awaryjne zgodnie z instrukcją UPS.\n6. Zabezpieczyć dostęp do pomieszczenia serwerowni.\n7. Sporządzić raport z przebiegu zdarzenia.\n\n## Kontrola końcowa\n\nPonowne uruchomienie infrastruktury może nastąpić wyłącznie po potwierdzeniu usunięcia zagrożenia.	2026-07-07 22:23:31	2026-07-07 22:23:38	2
\.


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.equipment (id, eq_type, name, map_id, x, y, label, rotation, color, rack_id) FROM stdin;
15	rack	1	1	3440	550	Rack Aula A206	0	#eab308	\N
16	rack	2	1	630	-430	Rack A203	0	#84cc16	\N
17	rack	3	1	-870	560	RACK A210	0	#8b5cf6	\N
18	rack	4	2	1230	-450	Rack A303	0	#84cc16	\N
19	rack	5	2	-310	560	Rack A312	0	#8b5cf6	\N
20	rack	6	2	2930	550	Rack A311	0	#eab308	\N
21	rack	7	2	4420	550	Rack A310	0	#f43f5e	\N
22	rack	8	2	4420	-1420	Rack A306	0	#06b6d4	\N
23	rack	9	2	4450	-1950	Rack A305	0	#3b82f6	\N
24	rack	10	3	-840	-920	Rack A403	0	#84cc16	\N
25	rack	11	3	-2390	60	Rack A410	0	#8b5cf6	\N
26	rack	12	3	1920	50	Rack Aula A406	0	#eab308	\N
27	rack	13	5	-520	-260	Rack Testowy	0	\N	\N
28	rack	14	5	320	-290	Performance Rack	0	\N	\N
29	rack	15	5	-510	210	TMP RACK	0	\N	\N
30	rack	16	5	370	200	Backups	0	\N	\N
37	rack	17	6	-750	-870	DEMOs RACK	0	\N	\N
38	rack	18	6	-260	250	Prod Devices	3.141592653589793	\N	\N
39	rack	19	6	250	-840	Testing Machines	0	#3b82f6	\N
\.


--
-- Data for Name: history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.history (id, entity_type, action, entity_id, user_id, "timestamp", before_state, after_state, can_rollback, extra_data) FROM stdin;
1	USER	CREATE	1	\N	2026-07-01 12:41:00.406859+00	\N	{"id": 1, "name": "Service Account", "email": "service@labbyn.service", "login": "Service", "surname": "System", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": true, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$JUDQTZ9/F5jEdboxIDY8EQ$+Dhy+OJ+V90wU3kpDcWt7ZUtlNT1es14Up0p/4fBSa0", "force_password_change": false}	t	\N
2	ROOM	CREATE	1	\N	2026-07-01 12:41:00.500857+00	\N	{"id": 1, "name": "Service Team (virtual)", "team_id": 1, "room_type": "virtual", "version_id": 1}	t	\N
3	USER	CREATE	2	1	2026-07-01 12:42:57.161288+00	\N	{"id": 2, "name": "Adrian", "email": "akopczynski@labbyn.com", "login": "akopczynski", "surname": "Kopczyński", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$BDJpemayDi+0YwkdAl82jA$qpML2VYbWkVh0s00Cq1OG7OkP2c2mc5pF1P7jm3Pw5M", "force_password_change": true}	t	\N
4	USER	CREATE	3	1	2026-07-01 12:43:24.952087+00	\N	{"id": 3, "name": "Patryk", "email": "pkosmider@labbyn.com", "login": "pkosmider", "surname": "Kośmider", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$d6wqnIz3j9rFm8Do0iQiXA$N407poqUEOb69COAH5KlxJxZxeccpdO7H2DvLfQMVpA", "force_password_change": true}	t	\N
5	USER	CREATE	4	1	2026-07-01 12:43:50.914111+00	\N	{"id": 4, "name": "Aleksander", "email": "astankowski@labbyn.com", "login": "astankowski", "surname": "Stankowski", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$9IzKTZE0G9TDTXSatIlX5w$03K3miacmxDesUl/3Eo7aXBrM2r2vjmtnTEeNqLLbCc", "force_password_change": true}	t	\N
6	USER	CREATE	5	1	2026-07-01 12:44:18.414555+00	\N	{"id": 5, "name": "Ziemowit", "email": "zorlikowski@labbyn.com", "login": "zorlikowski", "surname": "Orlikowski", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$EuY2FEoS/gk74ylTgJ7IkQ$2iEIpN+88RcJzCRjKN7Q727zK/8SgYkiTef+F5jgwtU", "force_password_change": true}	t	\N
7	ROOM	CREATE	2	1	2026-07-01 12:44:32.284058+00	\N	{"id": 2, "name": "Labbyn Team (virtual)", "team_id": 2, "room_type": "virtual", "version_id": 1}	t	\N
8	USER	CREATE	6	1	2026-07-01 12:45:37.214698+00	\N	{"id": 6, "name": "BSS", "email": "bss_admin@pjatk.pl", "login": "bss_admin", "surname": "Admin", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$E2pYnpzMrr5gRZAFW+kA+A$0Gm/r7cdF0VIRjvTnGnP2esYzm8NzcLlj2SfM1Ax7Ds", "force_password_change": true}	t	\N
9	ROOM	CREATE	3	1	2026-07-01 12:45:47.598558+00	\N	{"id": 3, "name": "PJATK (virtual)", "team_id": 3, "room_type": "virtual", "version_id": 1}	t	\N
10	USER	UPDATE	2	1	2026-07-01 12:46:59.157108+00	{"id": 2, "name": "Adrian", "email": "akopczynski@labbyn.com", "login": "akopczynski", "teams": [2, 6], "surname": "Kopczyński", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$BDJpemayDi+0YwkdAl82jA$qpML2VYbWkVh0s00Cq1OG7OkP2c2mc5pF1P7jm3Pw5M", "force_password_change": true}	{"id": 2, "name": "Adrian", "email": "akopczynski@labbyn.com", "login": "akopczynski", "teams": [], "surname": "Kopczyński", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$BDJpemayDi+0YwkdAl82jA$qpML2VYbWkVh0s00Cq1OG7OkP2c2mc5pF1P7jm3Pw5M", "force_password_change": true}	f	{}
11	USER	UPDATE	3	1	2026-07-01 12:47:03.818126+00	{"id": 3, "name": "Patryk", "email": "pkosmider@labbyn.com", "login": "pkosmider", "teams": [3, 7], "surname": "Kośmider", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$d6wqnIz3j9rFm8Do0iQiXA$N407poqUEOb69COAH5KlxJxZxeccpdO7H2DvLfQMVpA", "force_password_change": true}	{"id": 3, "name": "Patryk", "email": "pkosmider@labbyn.com", "login": "pkosmider", "teams": [], "surname": "Kośmider", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$d6wqnIz3j9rFm8Do0iQiXA$N407poqUEOb69COAH5KlxJxZxeccpdO7H2DvLfQMVpA", "force_password_change": true}	f	{}
12	USER	UPDATE	4	1	2026-07-01 12:47:08.218162+00	{"id": 4, "name": "Aleksander", "email": "astankowski@labbyn.com", "login": "astankowski", "teams": [4, 8], "surname": "Stankowski", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$9IzKTZE0G9TDTXSatIlX5w$03K3miacmxDesUl/3Eo7aXBrM2r2vjmtnTEeNqLLbCc", "force_password_change": true}	{"id": 4, "name": "Aleksander", "email": "astankowski@labbyn.com", "login": "astankowski", "teams": [], "surname": "Stankowski", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$9IzKTZE0G9TDTXSatIlX5w$03K3miacmxDesUl/3Eo7aXBrM2r2vjmtnTEeNqLLbCc", "force_password_change": true}	f	{}
13	USER	UPDATE	5	1	2026-07-01 12:47:12.798271+00	{"id": 5, "name": "Ziemowit", "email": "zorlikowski@labbyn.com", "login": "zorlikowski", "teams": [5, 9], "surname": "Orlikowski", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$EuY2FEoS/gk74ylTgJ7IkQ$2iEIpN+88RcJzCRjKN7Q727zK/8SgYkiTef+F5jgwtU", "force_password_change": true}	{"id": 5, "name": "Ziemowit", "email": "zorlikowski@labbyn.com", "login": "zorlikowski", "teams": [], "surname": "Orlikowski", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$EuY2FEoS/gk74ylTgJ7IkQ$2iEIpN+88RcJzCRjKN7Q727zK/8SgYkiTef+F5jgwtU", "force_password_change": true}	f	{}
16	CATEGORIES	CREATE	2	1	2026-07-01 12:49:25.497104+00	\N	{"id": 2, "name": "Kable Sieciowe", "version_id": 1}	t	\N
18	CATEGORIES	CREATE	4	1	2026-07-01 12:49:39.213608+00	\N	{"id": 4, "name": "Adaptery", "version_id": 1}	t	\N
20	CATEGORIES	CREATE	6	1	2026-07-01 12:49:51.325467+00	\N	{"id": 6, "name": "Klawiatury", "version_id": 1}	t	\N
14	USER	UPDATE	6	1	2026-07-01 12:47:19.634183+00	{"id": 6, "name": "BSS", "email": "bss_admin@pjatk.pl", "login": "bss_admin", "teams": [10, 11], "surname": "Admin", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$E2pYnpzMrr5gRZAFW+kA+A$0Gm/r7cdF0VIRjvTnGnP2esYzm8NzcLlj2SfM1Ax7Ds", "force_password_change": true}	{"id": 6, "name": "BSS", "email": "bss_admin@pjatk.pl", "login": "bss_admin", "teams": [], "surname": "Admin", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$E2pYnpzMrr5gRZAFW+kA+A$0Gm/r7cdF0VIRjvTnGnP2esYzm8NzcLlj2SfM1Ax7Ds", "force_password_change": true}	f	{}
15	CATEGORIES	CREATE	1	1	2026-07-01 12:49:15.199456+00	\N	{"id": 1, "name": "Kable USB", "version_id": 1}	t	\N
17	CATEGORIES	CREATE	3	1	2026-07-01 12:49:34.054659+00	\N	{"id": 3, "name": "Kable Zasilające", "version_id": 1}	t	\N
19	CATEGORIES	CREATE	5	1	2026-07-01 12:49:45.102635+00	\N	{"id": 5, "name": "Myszki", "version_id": 1}	t	\N
21	USER	UPDATE	6	\N	2026-07-01 12:51:42.024746+00	{"id": 6, "name": "BSS", "email": "bss_admin@pjatk.pl", "login": "bss_admin", "surname": "Admin", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$E2pYnpzMrr5gRZAFW+kA+A$0Gm/r7cdF0VIRjvTnGnP2esYzm8NzcLlj2SfM1Ax7Ds", "force_password_change": true}	{"id": 6, "name": "BSS", "email": "bss_admin@pjatk.pl", "login": "bss_admin", "surname": "Admin", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$YWUqf66qvFPMXIzb50MlCQ$vODfTHbhkeyHsrlZG+SxbphM1uOiPbr/SV1ixY7Rrys", "force_password_change": false}	t	{"hashed_password": {"new": "$argon2id$v=19$m=65536,t=3,p=4$YWUqf66qvFPMXIzb50MlCQ$vODfTHbhkeyHsrlZG+SxbphM1uOiPbr/SV1ixY7Rrys", "old": "$argon2id$v=19$m=65536,t=3,p=4$E2pYnpzMrr5gRZAFW+kA+A$0Gm/r7cdF0VIRjvTnGnP2esYzm8NzcLlj2SfM1Ax7Ds"}, "force_password_change": {"new": false, "old": true}}
24	ROOM	CREATE	6	6	2026-07-01 12:53:24.461334+00	\N	{"id": 6, "name": "Piętro 4", "team_id": 3, "room_type": "Piętro", "version_id": 1}	t	\N
38	MACHINES	CREATE	1	6	2026-07-01 13:06:09.84591+00	\N	{"id": 1, "os": "Ubuntu 24.01", "ram": "32", "name": "Serwer A210", "note": null, "team_id": 3, "added_on": "2026-07-01T13:06:09.852003", "pdu_port": 2, "shelf_id": 5, "ip_address": "192.168.0.1", "version_id": 1, "mac_address": "AA:CC:CC:CC:CC:CC", "metadata_id": 1, "serial_number": "SN-123213", "localization_id": 4}	t	\N
22	ROOM	CREATE	4	6	2026-07-01 12:53:01.492428+00	\N	{"id": 4, "name": "Piętro 2", "team_id": 3, "room_type": "Piętro", "version_id": 1}	t	\N
23	ROOM	CREATE	5	6	2026-07-01 12:53:13.184771+00	\N	{"id": 5, "name": "Piętro 3", "team_id": 3, "room_type": "Piętro", "version_id": 1}	t	\N
25	ROOM	CREATE	7	6	2026-07-01 12:53:33.545309+00	\N	{"id": 7, "name": "Piętro 5", "team_id": 3, "room_type": "Piętro", "version_id": 1}	t	\N
26	INVENTORY	CREATE	1	6	2026-07-01 12:54:52.370466+00	\N	{"id": 1, "name": "KEYCHRON K12P-J3 Wireless K Pro Brown RGB Czarno-niebieski", "team_id": 3, "quantity": 20, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 6, "rental_status": false, "localization_id": 3}	t	\N
27	INVENTORY	CREATE	2	6	2026-07-01 12:55:07.137592+00	\N	{"id": 2, "name": "REDRAGON Draconic V2 K730GB-RGB-PRO", "team_id": 3, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 6, "rental_status": false, "localization_id": 3}	t	\N
28	INVENTORY	CREATE	3	6	2026-07-01 12:55:21.064152+00	\N	{"id": 3, "name": "Logitech G102 LIGHTSYNC czarna", "team_id": 3, "quantity": 30, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 5, "rental_status": false, "localization_id": 3}	t	\N
29	INVENTORY	CREATE	4	6	2026-07-01 12:55:34.980252+00	\N	{"id": 4, "name": "Logitech G PRO X2 Superstrike", "team_id": 3, "quantity": 10, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 5, "rental_status": false, "localization_id": 3}	t	\N
30	INVENTORY	CREATE	5	6	2026-07-01 12:55:50.670428+00	\N	{"id": 5, "name": "Unitek Adapter USB - USB-C", "team_id": 3, "quantity": 70, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 4, "rental_status": false, "localization_id": 3}	t	\N
31	INVENTORY	CREATE	6	6	2026-07-01 12:56:03.846549+00	\N	{"id": 6, "name": "HP Adapter USB-C - HDMI", "team_id": 3, "quantity": 44, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 4, "rental_status": false, "localization_id": 3}	t	\N
32	INVENTORY	CREATE	7	6	2026-07-01 12:56:17.694616+00	\N	{"id": 7, "name": "Silver Monkey Kabel SCHUKO - C5 1,8m", "team_id": 3, "quantity": 100, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 3, "rental_status": false, "localization_id": 3}	t	\N
33	INVENTORY	CREATE	8	6	2026-07-01 12:56:32.889113+00	\N	{"id": 8, "name": "Silver Monkey Kabel Schuko - C8 1,8m", "team_id": 3, "quantity": 100, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 3, "rental_status": false, "localization_id": 3}	t	\N
34	INVENTORY	CREATE	9	6	2026-07-01 12:56:46.801093+00	\N	{"id": 9, "name": "Kabel RJ-45 - RJ-45 UTP kat.5e 15m", "team_id": 3, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 2, "rental_status": false, "localization_id": 3}	t	\N
35	INVENTORY	CREATE	10	6	2026-07-01 12:56:59.447324+00	\N	{"id": 10, "name": "RJ-45/RJ-45, kat.6A, S/FTP, szary, 0.25m", "team_id": 3, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 2, "rental_status": false, "localization_id": 3}	t	\N
36	INVENTORY	CREATE	11	6	2026-07-01 12:57:18.415472+00	\N	{"id": 11, "name": "UGREEN Kabel USB - micro USB 2,4 A 480 Mbps 1,5 m", "team_id": 3, "quantity": 31, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 1, "rental_status": false, "localization_id": 3}	t	\N
37	INVENTORY	CREATE	12	6	2026-07-01 12:57:31.300198+00	\N	{"id": 12, "name": "Unitek Kabel USB-C - USB-C - PD 100W, 10 Gbps", "team_id": 3, "quantity": 5, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 1, "rental_status": false, "localization_id": 3}	t	\N
39	MACHINES	CREATE	2	6	2026-07-01 13:07:05.346165+00	\N	{"id": 2, "os": "Windows 10", "ram": "16", "name": "Serwer A203", "note": null, "team_id": 3, "added_on": "2026-07-01T13:07:05.356017", "pdu_port": 1, "shelf_id": 4, "ip_address": "192.168.0.2", "version_id": 1, "mac_address": "AA:CC:CC:CC:CC:CF", "metadata_id": 2, "serial_number": "SN-123242", "localization_id": 4}	t	\N
40	MACHINES	CREATE	3	6	2026-07-01 13:07:56.334824+00	\N	{"id": 3, "os": "Ubuntu 24.01", "ram": "32", "name": "Serwer Aula A206", "note": null, "team_id": 3, "added_on": "2026-07-01T13:07:56.340212", "pdu_port": 6, "shelf_id": 1, "ip_address": "192.168.0.14", "version_id": 1, "mac_address": "AA:CC:CF:CC:CC:FC", "metadata_id": 3, "serial_number": "SN-123242221", "localization_id": 4}	t	\N
41	ROOM	DELETE	7	6	2026-07-07 19:38:32.327689+00	{"id": 7, "name": "Piętro 5", "team_id": 3, "room_type": "Piętro", "version_id": 1}	\N	t	\N
42	MACHINES	CREATE	4	6	2026-07-07 19:39:29.96374+00	\N	{"id": 4, "os": "Ubuntu 24.01", "ram": "32", "name": "Serwer A303", "note": null, "team_id": 3, "added_on": "2026-07-07T19:39:29.971068", "pdu_port": 1, "shelf_id": 7, "ip_address": "192.168.0.22", "version_id": 1, "mac_address": "AA:FF:CC:BB:CC:CF", "metadata_id": 4, "serial_number": "SN-123", "localization_id": 5}	t	\N
43	MACHINES	CREATE	5	6	2026-07-07 19:40:45.535864+00	\N	{"id": 5, "os": "Ubuntu 24.01", "ram": "12", "name": "Serwer A312", "note": null, "team_id": 3, "added_on": "2026-07-07T19:40:45.541263", "pdu_port": 2, "shelf_id": 9, "ip_address": "192.168.0.122", "version_id": 1, "mac_address": "AA:CC:BF:FF:DC:FC", "metadata_id": 5, "serial_number": "SN-123444", "localization_id": 5}	t	\N
44	MACHINES	CREATE	6	6	2026-07-07 19:41:45.859533+00	\N	{"id": 6, "os": "Ubuntu 24.01", "ram": "32", "name": "Serwer A311", "note": null, "team_id": 3, "added_on": "2026-07-07T19:41:45.865973", "pdu_port": 12, "shelf_id": 12, "ip_address": "192.168.1.134", "version_id": 1, "mac_address": "AA:FF:CB:BB:CC:CF", "metadata_id": 6, "serial_number": "SN-7654", "localization_id": 5}	t	\N
45	MACHINES	CREATE	7	6	2026-07-07 19:42:34.067782+00	\N	{"id": 7, "os": "Ubuntu 24.01", "ram": "12", "name": "Serwer A310", "note": null, "team_id": 3, "added_on": "2026-07-07T19:42:34.073461", "pdu_port": 4, "shelf_id": 13, "ip_address": "192.168.0.155", "version_id": 1, "mac_address": "BA:BC:BB:CC:CC:CC", "metadata_id": 7, "serial_number": "SN-123242455", "localization_id": 5}	t	\N
74	INVENTORY	CREATE	26	2	2026-07-07 20:19:17.986065+00	\N	{"id": 26, "name": "HP 320K Wired Keyboard", "team_id": 2, "quantity": 200, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 6, "rental_status": false, "localization_id": 2}	t	\N
46	MACHINES	CREATE	8	6	2026-07-07 19:44:04.881723+00	\N	{"id": 8, "os": "Ubuntu 24.01", "ram": "32", "name": "Serwer A306", "note": null, "team_id": 3, "added_on": "2026-07-07T19:44:04.887510", "pdu_port": 7, "shelf_id": 15, "ip_address": "192.168.1.151", "version_id": 1, "mac_address": "AA:FF:CF:BB:CC:CF", "metadata_id": 8, "serial_number": "SN-71222245", "localization_id": 5}	t	\N
47	MACHINES	CREATE	9	6	2026-07-07 19:45:07.330056+00	\N	{"id": 9, "os": "Windows 8", "ram": "32", "name": "Serwer A305", "note": null, "team_id": 3, "added_on": "2026-07-07T19:45:07.335973", "pdu_port": 5, "shelf_id": 17, "ip_address": "192.168.1.133", "version_id": 1, "mac_address": "AB:FF:CB:BB:BC:BF", "metadata_id": 9, "serial_number": "SN-1322223", "localization_id": 5}	t	\N
49	MACHINES	CREATE	11	6	2026-07-07 19:47:03.467042+00	\N	{"id": 11, "os": "Windows 10", "ram": "32", "name": "Serwer A403", "note": null, "team_id": 3, "added_on": "2026-07-07T19:47:03.479709", "pdu_port": 5, "shelf_id": 19, "ip_address": "192.168.12.144", "version_id": 1, "mac_address": "AA:FB:BB:BB:CC:CF", "metadata_id": 11, "serial_number": "SN-77777777", "localization_id": 6}	t	\N
51	MACHINES	CREATE	13	1	2026-07-07 19:57:43.057501+00	\N	{"id": 13, "os": "Ubuntu 22.04 LTS", "ram": "16", "name": "Test Station 01", "note": null, "team_id": 1, "added_on": "2026-07-07T19:57:43.063275", "pdu_port": 1, "shelf_id": 25, "ip_address": "192.168.10.101", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:01", "metadata_id": 13, "serial_number": "SN-PLT-2026-0001", "localization_id": 1}	t	\N
48	MACHINES	CREATE	10	6	2026-07-07 19:46:15.214123+00	\N	{"id": 10, "os": "Windows 10", "ram": "32", "name": "Serwer A410", "note": null, "team_id": 3, "added_on": "2026-07-07T19:46:15.227975", "pdu_port": 9, "shelf_id": 21, "ip_address": "192.168.1.199", "version_id": 1, "mac_address": "AA:FF:CB:BB:FF:FF", "metadata_id": 10, "serial_number": "SN-12322229", "localization_id": 6}	t	\N
50	MACHINES	CREATE	12	6	2026-07-07 19:48:06.590621+00	\N	{"id": 12, "os": "Windows 8", "ram": "32", "name": "Serwer Aula A406", "note": null, "team_id": 3, "added_on": "2026-07-07T19:48:06.596935", "pdu_port": 3, "shelf_id": 23, "ip_address": "192.168.12.132", "version_id": 1, "mac_address": "AA:CC:CC:CC:CC:CF", "metadata_id": 12, "serial_number": "SN-4444555", "localization_id": 6}	t	\N
52	MACHINES	CREATE	14	1	2026-07-07 19:58:25.417781+00	\N	{"id": 14, "os": "Ubuntu 24.04 LTS", "ram": "32", "name": "Test Station 02", "note": null, "team_id": 1, "added_on": "2026-07-07T19:58:25.423440", "pdu_port": 2, "shelf_id": 26, "ip_address": "192.168.10.102", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:02", "metadata_id": 14, "serial_number": "SN-PLT-2026-0002", "localization_id": 1}	t	\N
53	MACHINES	CREATE	15	1	2026-07-07 19:59:25.838178+00	\N	{"id": 15, "os": "Debian 12", "ram": "8", "name": "Performance Booster", "note": null, "team_id": 1, "added_on": "2026-07-07T19:59:25.843774", "pdu_port": 3, "shelf_id": 27, "ip_address": "192.168.10.103", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:03", "metadata_id": 15, "serial_number": "SN-PLT-2026-0003", "localization_id": 1}	t	\N
54	MACHINES	CREATE	16	1	2026-07-07 20:00:26.234782+00	\N	{"id": 16, "os": "Windows Server 2022", "ram": "64", "name": "Tmp machine", "note": null, "team_id": 1, "added_on": "2026-07-07T20:00:26.240512", "pdu_port": 6, "shelf_id": 29, "ip_address": "192.168.10.104", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:04", "metadata_id": 16, "serial_number": "SN-PLT-2026-0004", "localization_id": 1}	t	\N
55	MACHINES	CREATE	17	1	2026-07-07 20:01:49.289129+00	\N	{"id": 17, "os": "Red Hat Enterprise Linux 9", "ram": "64", "name": "Backup 001", "note": null, "team_id": 1, "added_on": "2026-07-07T20:01:49.295280", "pdu_port": 7, "shelf_id": 32, "ip_address": "192.168.10.105", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:05", "metadata_id": 17, "serial_number": "SN-PLT-2026-0005", "localization_id": 1}	t	\N
56	INVENTORY	CREATE	13	1	2026-07-07 20:03:06.693913+00	\N	{"id": 13, "name": "Anker PowerLine III USB-C 1.8 m", "team_id": 1, "quantity": 60, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 1, "rental_status": false, "localization_id": 1}	t	\N
57	INVENTORY	CREATE	14	1	2026-07-07 20:03:16.886881+00	\N	{"id": 14, "name": "UGREEN USB-C to USB-A 2.0 2 m", "team_id": 1, "quantity": 144, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 1, "rental_status": false, "localization_id": 1}	t	\N
58	INVENTORY	CREATE	15	1	2026-07-07 20:03:25.738189+00	\N	{"id": 15, "name": "Digitus CAT6 U/UTP 2 m", "team_id": 1, "quantity": 55, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 2, "rental_status": false, "localization_id": 1}	t	\N
59	INVENTORY	CREATE	16	1	2026-07-07 20:03:37.027321+00	\N	{"id": 16, "name": "Lanberg CAT6A S/FTP 5 m", "team_id": 1, "quantity": 600, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 2, "rental_status": false, "localization_id": 1}	t	\N
60	INVENTORY	CREATE	17	1	2026-07-07 20:03:48.157105+00	\N	{"id": 17, "name": "Lanberg Schuko C13 1.8 m", "team_id": 1, "quantity": 500, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 3, "rental_status": false, "localization_id": 1}	t	\N
61	INVENTORY	CREATE	18	1	2026-07-07 20:04:00.278059+00	\N	{"id": 18, "name": "Gembird C13–C14 2 m", "team_id": 1, "quantity": 15, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 3, "rental_status": false, "localization_id": 1}	t	\N
62	INVENTORY	CREATE	19	1	2026-07-07 20:04:12.15798+00	\N	{"id": 19, "name": "UGREEN USB-C do HDMI 4K", "team_id": 1, "quantity": 10, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 4, "rental_status": false, "localization_id": 1}	t	\N
63	INVENTORY	CREATE	20	1	2026-07-07 20:04:20.970272+00	\N	{"id": 20, "name": "Dell DA310 USB-C Mobile Adapter", "team_id": 1, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 4, "rental_status": false, "localization_id": 1}	t	\N
64	INVENTORY	CREATE	21	1	2026-07-07 20:04:31.56019+00	\N	{"id": 21, "name": "Logitech MX Master 3S", "team_id": 1, "quantity": 100, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 5, "rental_status": false, "localization_id": 1}	t	\N
65	INVENTORY	CREATE	22	1	2026-07-07 20:04:43.380186+00	\N	{"id": 22, "name": "Logitech M720 Triathlon", "team_id": 1, "quantity": 10, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 5, "rental_status": false, "localization_id": 1}	t	\N
66	INVENTORY	CREATE	23	1	2026-07-07 20:04:57.966295+00	\N	{"id": 23, "name": "Logitech MX Keys S", "team_id": 1, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 6, "rental_status": false, "localization_id": 1}	t	\N
67	INVENTORY	CREATE	24	1	2026-07-07 20:05:08.578143+00	\N	{"id": 24, "name": "Dell KB216", "team_id": 1, "quantity": 150, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 6, "rental_status": false, "localization_id": 1}	t	\N
68	USER	UPDATE	2	\N	2026-07-07 20:07:49.710787+00	{"id": 2, "name": "Adrian", "email": "akopczynski@labbyn.com", "login": "akopczynski", "surname": "Kopczyński", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$BDJpemayDi+0YwkdAl82jA$qpML2VYbWkVh0s00Cq1OG7OkP2c2mc5pF1P7jm3Pw5M", "force_password_change": true}	{"id": 2, "name": "Adrian", "email": "akopczynski@labbyn.com", "login": "akopczynski", "surname": "Kopczyński", "is_active": true, "user_type": "admin", "version_id": 1, "avatar_path": "/static/avatars/default.png", "is_verified": false, "is_superuser": true, "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$ZTQMsyaWHNUSJZBU6yj1CA$YAj0kviblJ9FDlP9RxDaBA+ZXta7v4dxoRn80SUbkbc", "force_password_change": false}	t	{"hashed_password": {"new": "$argon2id$v=19$m=65536,t=3,p=4$ZTQMsyaWHNUSJZBU6yj1CA$YAj0kviblJ9FDlP9RxDaBA+ZXta7v4dxoRn80SUbkbc", "old": "$argon2id$v=19$m=65536,t=3,p=4$BDJpemayDi+0YwkdAl82jA$qpML2VYbWkVh0s00Cq1OG7OkP2c2mc5pF1P7jm3Pw5M"}, "force_password_change": {"new": false, "old": true}}
69	MACHINES	CREATE	18	2	2026-07-07 20:14:52.476321+00	\N	{"id": 18, "os": "Windows Server 2019", "ram": "32", "name": "Demo 001", "note": null, "team_id": 2, "added_on": "2026-07-07T20:14:52.481745", "pdu_port": 5, "shelf_id": 33, "ip_address": "192.168.10.110", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:0A", "metadata_id": 18, "serial_number": "SN-PLT-2026-0010", "localization_id": 2}	t	\N
70	MACHINES	CREATE	19	2	2026-07-07 20:15:38.91298+00	\N	{"id": 19, "os": "VMware ESXi 8.0", "ram": "256", "name": "Demo 002", "note": null, "team_id": 2, "added_on": "2026-07-07T20:15:38.918276", "pdu_port": 2, "shelf_id": 34, "ip_address": "192.168.10.109", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:09", "metadata_id": 19, "serial_number": "SN-PLT-2026-0009", "localization_id": 2}	t	\N
71	MACHINES	CREATE	20	2	2026-07-07 20:16:40.444085+00	\N	{"id": 20, "os": "Ubuntu 22.04 LTS", "ram": "128", "name": "LabbynTest01", "note": null, "team_id": 2, "added_on": "2026-07-07T20:16:40.454736", "pdu_port": 8, "shelf_id": 37, "ip_address": "192.168.10.108", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:08", "metadata_id": 20, "serial_number": "SN-PLT-2026-0008", "localization_id": 2}	t	\N
73	INVENTORY	CREATE	25	2	2026-07-07 20:19:08.44316+00	\N	{"id": 25, "name": "Cherry KC 6000 Slim", "team_id": 2, "quantity": 100, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 6, "rental_status": false, "localization_id": 2}	t	\N
75	INVENTORY	CREATE	27	2	2026-07-07 20:19:28.899003+00	\N	{"id": 27, "name": "HP 430 Multi-Device Wireless Mouse", "team_id": 2, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 5, "rental_status": false, "localization_id": 2}	t	\N
78	INVENTORY	CREATE	30	2	2026-07-07 20:20:05.597783+00	\N	{"id": 30, "name": "Anker USB-C 7-in-1 Hub", "team_id": 2, "quantity": 250, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 4, "rental_status": false, "localization_id": 2}	t	\N
72	MACHINES	CREATE	21	2	2026-07-07 20:17:47.749615+00	\N	{"id": 21, "os": "Red Hat Enterprise Linux 9", "ram": "64", "name": "ProdMaster_012", "note": null, "team_id": 2, "added_on": "2026-07-07T20:17:47.755210", "pdu_port": 7, "shelf_id": 35, "ip_address": "192.168.10.107", "version_id": 1, "mac_address": "00:1A:2B:3C:4D:07", "metadata_id": 21, "serial_number": "SN-PLT-2026-0007", "localization_id": 2}	t	\N
81	INVENTORY	CREATE	33	2	2026-07-07 20:20:44.169023+00	\N	{"id": 33, "name": "LogiLink CAT7 S/FTP 10 m", "team_id": 2, "quantity": 25, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 2, "rental_status": false, "localization_id": 2}	t	\N
84	INVENTORY	CREATE	36	2	2026-07-07 20:21:17.26248+00	\N	{"id": 36, "name": "Belkin BoostCharge USB-C to USB-C 100W 2 m", "team_id": 2, "quantity": 100, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 1, "rental_status": false, "localization_id": 2}	t	\N
76	INVENTORY	CREATE	28	2	2026-07-07 20:19:42.495914+00	\N	{"id": 28, "name": "Dell MS3220", "team_id": 2, "quantity": 250, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 5, "rental_status": false, "localization_id": 2}	t	\N
79	INVENTORY	CREATE	31	2	2026-07-07 20:20:19.177016+00	\N	{"id": 31, "name": "LogiLink CEE 7/7 do C13 5 m", "team_id": 2, "quantity": 15, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 3, "rental_status": false, "localization_id": 2}	t	\N
82	INVENTORY	CREATE	34	2	2026-07-07 20:20:53.15888+00	\N	{"id": 34, "name": "Gembird CAT5e UTP 3 m", "team_id": 2, "quantity": 55, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 2, "rental_status": false, "localization_id": 2}	t	\N
77	INVENTORY	CREATE	29	2	2026-07-07 20:19:52.629144+00	\N	{"id": 29, "name": "TP-Link UE300 USB 3.0 do Gigabit Ethernet", "team_id": 2, "quantity": 50, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 4, "rental_status": false, "localization_id": 2}	t	\N
80	INVENTORY	CREATE	32	2	2026-07-07 20:20:30.805054+00	\N	{"id": 32, "name": "Digitus IEC C13 3 m", "team_id": 2, "quantity": 10, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 3, "rental_status": false, "localization_id": 2}	t	\N
83	INVENTORY	CREATE	35	2	2026-07-07 20:21:04.347854+00	\N	{"id": 35, "name": "Baseus Cafule USB-A to USB-C 3 A 1 m", "team_id": 2, "quantity": 300, "rental_id": null, "machine_id": null, "version_id": 1, "category_id": 1, "rental_status": false, "localization_id": 2}	t	\N
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.inventory (id, name, quantity, team_id, localization_id, category_id, rental_status, rental_id, version_id, machine_id) FROM stdin;
1	KEYCHRON K12P-J3 Wireless K Pro Brown RGB Czarno-niebieski	20	3	3	6	f	\N	1	\N
2	REDRAGON Draconic V2 K730GB-RGB-PRO	50	3	3	6	f	\N	1	\N
3	Logitech G102 LIGHTSYNC czarna	30	3	3	5	f	\N	1	\N
4	Logitech G PRO X2 Superstrike	10	3	3	5	f	\N	1	\N
5	Unitek Adapter USB - USB-C	70	3	3	4	f	\N	1	\N
6	HP Adapter USB-C - HDMI	44	3	3	4	f	\N	1	\N
7	Silver Monkey Kabel SCHUKO - C5 1,8m	100	3	3	3	f	\N	1	\N
8	Silver Monkey Kabel Schuko - C8 1,8m	100	3	3	3	f	\N	1	\N
9	Kabel RJ-45 - RJ-45 UTP kat.5e 15m	50	3	3	2	f	\N	1	\N
10	RJ-45/RJ-45, kat.6A, S/FTP, szary, 0.25m	50	3	3	2	f	\N	1	\N
11	UGREEN Kabel USB - micro USB 2,4 A 480 Mbps 1,5 m	31	3	3	1	f	\N	1	\N
12	Unitek Kabel USB-C - USB-C - PD 100W, 10 Gbps	5	3	3	1	f	\N	1	\N
13	Anker PowerLine III USB-C 1.8 m	60	1	1	1	f	\N	1	\N
14	UGREEN USB-C to USB-A 2.0 2 m	144	1	1	1	f	\N	1	\N
15	Digitus CAT6 U/UTP 2 m	55	1	1	2	f	\N	1	\N
16	Lanberg CAT6A S/FTP 5 m	600	1	1	2	f	\N	1	\N
17	Lanberg Schuko C13 1.8 m	500	1	1	3	f	\N	1	\N
18	Gembird C13–C14 2 m	15	1	1	3	f	\N	1	\N
19	UGREEN USB-C do HDMI 4K	10	1	1	4	f	\N	1	\N
20	Dell DA310 USB-C Mobile Adapter	50	1	1	4	f	\N	1	\N
21	Logitech MX Master 3S	100	1	1	5	f	\N	1	\N
22	Logitech M720 Triathlon	10	1	1	5	f	\N	1	\N
23	Logitech MX Keys S	50	1	1	6	f	\N	1	\N
24	Dell KB216	150	1	1	6	f	\N	1	\N
25	Cherry KC 6000 Slim	100	2	2	6	f	\N	1	\N
26	HP 320K Wired Keyboard	200	2	2	6	f	\N	1	\N
27	HP 430 Multi-Device Wireless Mouse	50	2	2	5	f	\N	1	\N
28	Dell MS3220	250	2	2	5	f	\N	1	\N
29	TP-Link UE300 USB 3.0 do Gigabit Ethernet	50	2	2	4	f	\N	1	\N
30	Anker USB-C 7-in-1 Hub	250	2	2	4	f	\N	1	\N
31	LogiLink CEE 7/7 do C13 5 m	15	2	2	3	f	\N	1	\N
32	Digitus IEC C13 3 m	10	2	2	3	f	\N	1	\N
33	LogiLink CAT7 S/FTP 10 m	25	2	2	2	f	\N	1	\N
34	Gembird CAT5e UTP 3 m	55	2	2	2	f	\N	1	\N
35	Baseus Cafule USB-A to USB-C 3 A 1 m	300	2	2	1	f	\N	1	\N
36	Belkin BoostCharge USB-C to USB-C 100W 2 m	100	2	2	1	f	\N	1	\N
\.


--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.machines (id, name, localization_id, mac_address, ip_address, pdu_port, team_id, os, serial_number, note, added_on, ram, metadata_id, shelf_id, version_id) FROM stdin;
1	Serwer A210	4	AA:CC:CC:CC:CC:CC	192.168.0.1	2	3	Ubuntu 24.01	SN-123213	\N	2026-07-01 13:06:09.852003	32	1	5	1
2	Serwer A203	4	AA:CC:CC:CC:CC:CF	192.168.0.2	1	3	Windows 10	SN-123242	\N	2026-07-01 13:07:05.356017	16	2	4	1
3	Serwer Aula A206	4	AA:CC:CF:CC:CC:FC	192.168.0.14	6	3	Ubuntu 24.01	SN-123242221	\N	2026-07-01 13:07:56.340212	32	3	1	1
4	Serwer A303	5	AA:FF:CC:BB:CC:CF	192.168.0.22	1	3	Ubuntu 24.01	SN-123	\N	2026-07-07 19:39:29.971068	32	4	7	1
5	Serwer A312	5	AA:CC:BF:FF:DC:FC	192.168.0.122	2	3	Ubuntu 24.01	SN-123444	\N	2026-07-07 19:40:45.541263	12	5	9	1
6	Serwer A311	5	AA:FF:CB:BB:CC:CF	192.168.1.134	12	3	Ubuntu 24.01	SN-7654	\N	2026-07-07 19:41:45.865973	32	6	12	1
7	Serwer A310	5	BA:BC:BB:CC:CC:CC	192.168.0.155	4	3	Ubuntu 24.01	SN-123242455	\N	2026-07-07 19:42:34.073461	12	7	13	1
8	Serwer A306	5	AA:FF:CF:BB:CC:CF	192.168.1.151	7	3	Ubuntu 24.01	SN-71222245	\N	2026-07-07 19:44:04.88751	32	8	15	1
9	Serwer A305	5	AB:FF:CB:BB:BC:BF	192.168.1.133	5	3	Windows 8	SN-1322223	\N	2026-07-07 19:45:07.335973	32	9	17	1
10	Serwer A410	6	AA:FF:CB:BB:FF:FF	192.168.1.199	9	3	Windows 10	SN-12322229	\N	2026-07-07 19:46:15.227975	32	10	21	1
11	Serwer A403	6	AA:FB:BB:BB:CC:CF	192.168.12.144	5	3	Windows 10	SN-77777777	\N	2026-07-07 19:47:03.479709	32	11	19	1
12	Serwer Aula A406	6	AA:CC:CC:CC:CC:CF	192.168.12.132	3	3	Windows 8	SN-4444555	\N	2026-07-07 19:48:06.596935	32	12	23	1
13	Test Station 01	1	00:1A:2B:3C:4D:01	192.168.10.101	1	1	Ubuntu 22.04 LTS	SN-PLT-2026-0001	\N	2026-07-07 19:57:43.063275	16	13	25	1
14	Test Station 02	1	00:1A:2B:3C:4D:02	192.168.10.102	2	1	Ubuntu 24.04 LTS	SN-PLT-2026-0002	\N	2026-07-07 19:58:25.42344	32	14	26	1
15	Performance Booster	1	00:1A:2B:3C:4D:03	192.168.10.103	3	1	Debian 12	SN-PLT-2026-0003	\N	2026-07-07 19:59:25.843774	8	15	27	1
16	Tmp machine	1	00:1A:2B:3C:4D:04	192.168.10.104	6	1	Windows Server 2022	SN-PLT-2026-0004	\N	2026-07-07 20:00:26.240512	64	16	29	1
17	Backup 001	1	00:1A:2B:3C:4D:05	192.168.10.105	7	1	Red Hat Enterprise Linux 9	SN-PLT-2026-0005	\N	2026-07-07 20:01:49.29528	64	17	32	1
18	Demo 001	2	00:1A:2B:3C:4D:0A	192.168.10.110	5	2	Windows Server 2019	SN-PLT-2026-0010	\N	2026-07-07 20:14:52.481745	32	18	33	1
19	Demo 002	2	00:1A:2B:3C:4D:09	192.168.10.109	2	2	VMware ESXi 8.0	SN-PLT-2026-0009	\N	2026-07-07 20:15:38.918276	256	19	34	1
20	LabbynTest01	2	00:1A:2B:3C:4D:08	192.168.10.108	8	2	Ubuntu 22.04 LTS	SN-PLT-2026-0008	\N	2026-07-07 20:16:40.454736	128	20	37	1
21	ProdMaster_012	2	00:1A:2B:3C:4D:07	192.168.10.107	7	2	Red Hat Enterprise Linux 9	SN-PLT-2026-0007	\N	2026-07-07 20:17:47.75521	64	21	35	1
\.


--
-- Data for Name: map_labels; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.map_labels (id, map_id, name, x, y, color) FROM stdin;
25	1	A210	-23	77	#8b5cf6
26	1	A203	171	-30	#84cc16
27	1	Aula A206	263	75	#eab308
40	2	A303	201	-25	#84cc16
41	2	A312	28	76	#8b5cf6
42	2	A311	207	73	#eab308
43	2	A310	386	76	#f43f5e
44	2	A306	428	-26	#06b6d4
45	2	A305	431	-178	#3b82f6
46	3	A403	0	-82	#84cc16
47	3	A410	-174	19	#8b5cf6
48	3	Aula A406	75	10	#eab308
50	6	Testing Area	41	-43	#3b82f6
\.


--
-- Data for Name: maps; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.maps (id, room_id) FROM stdin;
1	4
2	5
3	6
5	1
6	2
\.


--
-- Data for Name: metadata; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.metadata (id, last_update, agent_prometheus, ansible_access, ansible_root_access, version_id) FROM stdin;
1	\N	f	f	f	1
2	\N	f	f	f	1
3	\N	f	f	f	1
4	\N	f	f	f	1
5	\N	f	f	f	1
6	\N	f	f	f	1
7	\N	f	f	f	1
8	\N	f	f	f	1
9	\N	f	f	f	1
10	\N	f	f	f	1
11	\N	f	f	f	1
12	\N	f	f	f	1
13	\N	f	f	f	1
14	\N	f	f	f	1
15	\N	f	f	f	1
16	\N	f	f	f	1
17	\N	f	f	f	1
18	\N	f	f	f	1
19	\N	f	f	f	1
20	\N	f	f	f	1
21	\N	f	f	f	1
\.


--
-- Data for Name: racks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.racks (id, name, room_id, team_id, version_id) FROM stdin;
1	Rack Aula A206	4	3	1
2	Rack A203	4	3	1
3	RACK A210	4	3	1
4	Rack A303	5	3	1
5	Rack A312	5	3	1
6	Rack A311	5	3	1
7	Rack A310	5	3	1
8	Rack A306	5	3	1
9	Rack A305	5	3	1
10	Rack A403	6	3	1
11	Rack A410	6	3	1
12	Rack Aula A406	6	3	1
13	Rack Testowy	1	1	1
14	Performance Rack	1	1	1
15	TMP RACK	1	1	1
16	Backups	1	1	1
17	DEMOs RACK	2	2	1
18	Prod Devices	2	2	1
19	Testing Machines	2	2	1
\.


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.rentals (id, item_id, team_id, start_date, end_date, user_id, quantity, version_id) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.rooms (id, name, room_type, team_id, version_id) FROM stdin;
1	Service Team (virtual)	virtual	1	1
2	Labbyn Team (virtual)	virtual	2	1
3	PJATK (virtual)	virtual	3	1
4	Piętro 2	Piętro	3	1
5	Piętro 3	Piętro	3	1
6	Piętro 4	Piętro	3	1
\.


--
-- Data for Name: shelves; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.shelves (id, name, rack_id, "order", version_id) FROM stdin;
1	Shelf 1	1	1	1
2	Shelf 2	1	2	1
3	Shelf 1	2	1	1
4	Shelf 2	2	2	1
5	Shelf 1	3	1	1
6	Shelf 2	3	2	1
7	Shelf 1	4	1	1
8	Shelf 2	4	2	1
9	Shelf 1	5	1	1
10	Shelf 2	5	2	1
11	Shelf 1	6	1	1
12	Shelf 2	6	2	1
13	Shelf 1	7	1	1
14	Shelf 2	7	2	1
15	Shelf 1	8	1	1
16	Shelf 2	8	2	1
17	Shelf 1	9	1	1
18	Shelf 2	9	2	1
19	Shelf 1	10	1	1
20	Shelf 2	10	2	1
21	Shelf 1	11	1	1
22	Shelf 2	11	2	1
23	Shelf 1	12	1	1
24	Shelf 2	12	2	1
25	Shelf 1	13	1	1
26	Shelf 2	13	2	1
27	Shelf 1	14	1	1
28	Shelf 2	14	2	1
29	Shelf 1	15	1	1
30	Shelf 2	15	2	1
31	Shelf 1	16	1	1
32	Shelf 2	16	2	1
33	Shelf 1	17	1	1
34	Shelf 2	17	2	1
35	Shelf 1	18	1	1
36	Shelf 2	18	2	1
37	Shelf 1	19	1	1
38	Shelf 2	19	2	1
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.tags (id, name, color, version_id) FROM stdin;
1	Piętro 1	blue	1
2	Piętro 2	blue	1
3	Piętro 3	blue	1
4	Piętro 4	blue	1
5	Piętro 5	blue	1
6	Testing	orange	1
7	Performance	brown	1
8	TEMP	lightBlue	1
9	Network	gray	1
10	Backup	green	1
11	PROD	orange	1
12	DEMO	purple	1
\.


--
-- Data for Name: tags_documentation; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.tags_documentation (id, documentation_id, tag_id) FROM stdin;
\.


--
-- Data for Name: tags_machines; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.tags_machines (id, machine_id, tag_id) FROM stdin;
\.


--
-- Data for Name: tags_racks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.tags_racks (id, rack_id, tag_id) FROM stdin;
1	1	2
2	2	2
3	3	2
4	4	3
5	5	3
6	6	3
7	7	3
8	8	3
9	9	3
10	10	4
11	11	4
12	12	4
13	13	6
14	13	8
15	14	7
16	15	8
17	15	10
18	16	10
19	17	12
20	18	11
21	19	6
22	19	11
\.


--
-- Data for Name: tags_rooms; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.tags_rooms (id, room_id, tag_id) FROM stdin;
1	4	2
2	5	3
3	6	4
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.teams (id, name, version_id) FROM stdin;
1	Service Team	1
2	Labbyn Team	1
3	PJATK	1
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."user" (id, name, surname, login, email, avatar_path, hashed_password, is_active, is_superuser, is_verified, user_type, force_password_change, version_id) FROM stdin;
1	Service Account	System	Service	service@labbyn.service	/static/avatars/default.png	$argon2id$v=19$m=65536,t=3,p=4$JUDQTZ9/F5jEdboxIDY8EQ$+Dhy+OJ+V90wU3kpDcWt7ZUtlNT1es14Up0p/4fBSa0	t	t	t	ADMIN	f	1
3	Patryk	Kośmider	pkosmider	pkosmider@labbyn.com	/static/avatars/default.png	$argon2id$v=19$m=65536,t=3,p=4$d6wqnIz3j9rFm8Do0iQiXA$N407poqUEOb69COAH5KlxJxZxeccpdO7H2DvLfQMVpA	t	t	f	ADMIN	t	1
4	Aleksander	Stankowski	astankowski	astankowski@labbyn.com	/static/avatars/default.png	$argon2id$v=19$m=65536,t=3,p=4$9IzKTZE0G9TDTXSatIlX5w$03K3miacmxDesUl/3Eo7aXBrM2r2vjmtnTEeNqLLbCc	t	t	f	ADMIN	t	1
5	Ziemowit	Orlikowski	zorlikowski	zorlikowski@labbyn.com	/static/avatars/default.png	$argon2id$v=19$m=65536,t=3,p=4$EuY2FEoS/gk74ylTgJ7IkQ$2iEIpN+88RcJzCRjKN7Q727zK/8SgYkiTef+F5jgwtU	t	t	f	ADMIN	t	1
6	BSS	Admin	bss_admin	bss_admin@pjatk.pl	/static/avatars/default.png	$argon2id$v=19$m=65536,t=3,p=4$YWUqf66qvFPMXIzb50MlCQ$vODfTHbhkeyHsrlZG+SxbphM1uOiPbr/SV1ixY7Rrys	t	t	f	ADMIN	f	2
2	Adrian	Kopczyński	akopczynski	akopczynski@labbyn.com	/static/avatars/default.png	$argon2id$v=19$m=65536,t=3,p=4$ZTQMsyaWHNUSJZBU6yj1CA$YAj0kviblJ9FDlP9RxDaBA+ZXta7v4dxoRn80SUbkbc	t	t	f	ADMIN	f	2
\.


--
-- Data for Name: users_teams; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users_teams (id, user_id, team_id, is_group_admin) FROM stdin;
1	1	1	t
12	2	2	t
16	6	3	t
13	3	2	t
15	5	2	t
14	4	2	t
\.


--
-- Data for Name: wall_segments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.wall_segments (id, map_id, name, node1_id, node2_id, node1_name, node2_name) FROM stdin;
244	2	WS-1783452210114	332	331	WN-1783452207347	WN-1783452210114
245	2	WS-1783452201193	334	333	WN-1783452196846	WN-1783452201193
246	2	WS-1783452196846	335	334	WN-1783452194059	WN-1783452196846
247	2	WS-1783452185957	337	336	WN-1783452173611	WN-1783452185957
248	2	WS-1783452111218	339	338	WN-1783452107367	WN-1783452111218
249	2	WS-1783452102901	342	340	WN-1783452080707	WN-1783452102901
250	2	WS-1783452084560	342	341	WN-1783452080707	WN-1783452084560
251	2	WS-1783452080707	343	342	WN-1783452076081	WN-1783452080707
252	2	WS-1783452071257	345	344	WN-1783452067526	WN-1783452071257
253	2	WS-1783452043699	356	346	WN-1783451941583	WN-1783452043699
254	2	WS-1783452035594	348	347	WN-1783452033822	WN-1783452035594
255	2	WS-1783452033822	349	348	WN-1783452030104	WN-1783452033822
256	2	WS-1783452030105	350	349	WN-1783452028126	WN-1783452030104
257	2	WS-1783452019522	352	351	WN-1783452015823	WN-1783452019522
258	2	WS-1783452015823	353	352	WN-1783452014327	WN-1783452015823
259	2	WS-1783452006553	355	354	WN-1783452003180	WN-1783452006553
260	2	WS-1783451944658	356	361	WN-1783451941583	WN-1783451913452
261	2	WS-1783451941583	357	356	WN-1783451938243	WN-1783451941583
262	2	WS-1783451938243	358	357	WN-1783451934806	WN-1783451938243
263	2	WS-1783451934806	359	358	WN-1783451928429	WN-1783451934806
264	2	WS-1783451928429	360	359	WN-1783451917135	WN-1783451928429
265	2	WS-1783451917135	361	360	WN-1783451913452	WN-1783451917135
339	6	WS-1783454985021	456	441	WN-1783454984176	WN-1783454964579
340	6	WS-1783454984176	455	456	WN-1783454982833	WN-1783454984176
341	6	WS-1783454982833	454	455	WN-1783454981815	WN-1783454982833
342	6	WS-1783454981815	453	454	WN-1783454979689	WN-1783454981815
343	6	WS-1783454979689	452	453	WN-1783454978617	WN-1783454979689
344	6	WS-1783454978617	451	452	WN-1783454976045	WN-1783454978617
345	6	WS-1783454976045	450	451	WN-1783454974978	WN-1783454976045
346	6	WS-1783454974978	449	450	WN-1783454974022	WN-1783454974978
347	6	WS-1783454974022	448	449	WN-1783454972987	WN-1783454974022
348	6	WS-1783454972987	447	448	WN-1783454972002	WN-1783454972987
349	6	WS-1783454972002	446	447	WN-1783454970633	WN-1783454972002
350	6	WS-1783454970633	445	446	WN-1783454969616	WN-1783454970633
351	6	WS-1783454969616	444	445	WN-1783454968205	WN-1783454969616
352	6	WS-1783454968205	443	444	WN-1783454966626	WN-1783454968205
353	6	WS-1783454966626	442	443	WN-1783454965700	WN-1783454966626
354	6	WS-1783454965701	441	442	WN-1783454964579	WN-1783454965700
266	3	WS-1783452635560	383	384	WN-1783452632677	WN-1783452635560
267	3	WS-1783452629485	381	382	WN-1783452624990	WN-1783452629485
268	3	WS-1783452624990	380	381	WN-1783452623381	WN-1783452624990
269	3	WS-1783452618464	378	379	WN-1783452612988	WN-1783452618464
270	3	WS-1783452609820	376	377	WN-1783452605997	WN-1783452609820
271	3	WS-1783452605997	375	376	WN-1783452602943	WN-1783452605997
272	3	WS-1783452599253	373	374	WN-1783452593166	WN-1783452599252
273	3	WS-1783452586360	372	367	WN-1783452585194	WN-1783452388057
274	3	WS-1783452525892	370	371	WN-1783452524264	WN-1783452525892
275	3	WS-1783452524264	369	370	WN-1783452521989	WN-1783452524264
276	3	WS-1783452521989	368	369	WN-1783452517310	WN-1783452521989
277	3	WS-1783452389520	367	362	WN-1783452388057	WN-1783452366424
278	3	WS-1783452388057	366	367	WN-1783452385104	WN-1783452388057
279	3	WS-1783452385104	365	366	WN-1783452382289	WN-1783452385104
280	3	WS-1783452382289	364	365	WN-1783452378073	WN-1783452382289
154	1	WS-1782910711882	207	208	WN-1782910703674	WN-1782910711882
155	1	WS-1782910726070	208	209	WN-1782910711882	WN-1782910726070
156	1	WS-1782910733340	209	210	WN-1782910726070	WN-1782910733340
157	1	WS-1782910811092	211	212	WN-1782910803772	WN-1782910811092
158	1	WS-1782910826253	213	214	WN-1782910817119	WN-1782910826253
159	1	WS-1782910836112	213	215	WN-1782910817119	WN-1782910836112
160	1	WS-1782910845502	216	217	WN-1782910842750	WN-1782910845502
161	1	WS-1782910853613	218	219	WN-1782910851186	WN-1782910853613
162	1	WS-1782910855919	219	220	WN-1782910853613	WN-1782910855919
163	1	WS-1782910860535	221	222	WN-1782910859055	WN-1782910860535
164	1	WS-1782910869526	223	224	WN-1782910867658	WN-1782910869525
165	1	WS-1782910872733	224	225	WN-1782910869525	WN-1782910872733
166	1	WS-1782910878637	225	226	WN-1782910872733	WN-1782910878637
167	1	WS-1782911061642	210	228	WN-1782910733340	WN-1782911061642
168	1	WS-1782911064333	228	229	WN-1782911061642	WN-1782911064333
169	1	WS-1782911067099	229	230	WN-1782911064333	WN-1782911067099
170	1	WS-1782911084716	227	229	WN-1782910883970	WN-1782911064333
281	3	WS-1783452378073	363	364	WN-1783452370534	WN-1783452378073
282	3	WS-1783452370534	362	363	WN-1783452366424	WN-1783452370534
287	5	WS-1783453773620	392	391	WN-1783453771319	WN-1783453773620
288	5	WS-1783453775757	391	390	WN-1783453773620	WN-1783453775757
289	5	WS-1783453777700	390	389	WN-1783453775757	WN-1783453777700
290	5	WS-1783453779238	389	392	WN-1783453777700	WN-1783453771319
\.


--
-- Data for Name: walls_nodes; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.walls_nodes (id, map_id, name, x, y) FROM stdin;
207	1	WN-1782910703674	-1000	-510
208	1	WN-1782910711882	-1010	1000
209	1	WN-1782910726070	4000	1000
210	1	WN-1782910733340	4010	-2000
211	1	WN-1782910803772	-1000	500
212	1	WN-1782910811092	0	500
213	1	WN-1782910817119	500	500
214	1	WN-1782910826253	500	980
215	1	WN-1782910836112	1000	500
216	1	WN-1782910842750	1500	500
217	1	WN-1782910845502	2500	500
218	1	WN-1782910851186	2990	500
219	1	WN-1782910853613	3500	500
220	1	WN-1782910855919	3500	-990
221	1	WN-1782910859055	3500	-1500
222	1	WN-1782910860535	3500	-1990
223	1	WN-1782910867658	500	-500
224	1	WN-1782910869525	500	0
225	1	WN-1782910872733	2500	0
226	1	WN-1782910878637	2500	-200
227	1	WN-1782910883970	2500	-300
228	1	WN-1782911061642	2500	-2000
229	1	WN-1782911064333	2500	-500
230	1	WN-1782911067099	-1000	-500
362	3	WN-1783452366424	-2500	-1000
363	3	WN-1783452370534	-2500	500
364	3	WN-1783452378073	2500	500
365	3	WN-1783452382289	2500	-2500
366	3	WN-1783452385104	1000	-2500
367	3	WN-1783452388057	1000	-1000
368	3	WN-1783452517310	-1000	-980
369	3	WN-1783452521989	-1000	-500
370	3	WN-1783452524264	1000	-500
371	3	WN-1783452525892	1000	-720
372	3	WN-1783452585194	1000	-800
373	3	WN-1783452593166	-2490	0
374	3	WN-1783452599252	-1510	0
375	3	WN-1783452602943	-1000	480
376	3	WN-1783452605997	-1000	0
377	3	WN-1783452609820	-500	0
378	3	WN-1783452612988	0	0
379	3	WN-1783452618464	1000	0
380	3	WN-1783452623381	1500	0
381	3	WN-1783452624990	2000	0
382	3	WN-1783452629485	2000	-1510
331	2	WN-1783452210114	4000	-1740
332	2	WN-1783452207347	4000	-1990
333	2	WN-1783452201193	4160	-1750
334	2	WN-1783452196846	4160	-1500
335	2	WN-1783452194059	4500	-1500
336	2	WN-1783452185957	4000	-1500
337	2	WN-1783452173611	4000	490
338	2	WN-1783452111218	4490	500
339	2	WN-1783452107367	3500	500
340	2	WN-1783452102901	3310	500
341	2	WN-1783452084560	2800	500
342	2	WN-1783452080707	3000	500
343	2	WN-1783452076081	3000	980
344	2	WN-1783452071257	2600	500
345	2	WN-1783452067526	1700	500
346	2	WN-1783452043699	3000	-300
347	2	WN-1783452035594	3000	-200
348	2	WN-1783452033822	3000	0
349	2	WN-1783452030104	1000	0
350	2	WN-1783452028126	1000	-490
351	2	WN-1783452019522	1500	500
352	2	WN-1783452015823	1000	500
353	2	WN-1783452014327	1000	980
354	2	WN-1783452006553	-490	500
389	5	WN-1783453777700	-1000	500
390	5	WN-1783453775757	1000	500
391	5	WN-1783453773620	1000	-500
392	5	WN-1783453771319	-1000	-500
441	6	WN-1783454964579	-1500	-500
442	6	WN-1783454965700	-1000	-500
443	6	WN-1783454966626	-1000	-1000
355	2	WN-1783452003180	500	500
356	2	WN-1783451941583	3000	-510
357	2	WN-1783451938243	3000	-2000
358	2	WN-1783451934806	4510	-2000
359	2	WN-1783451928429	4500	990
360	2	WN-1783451917135	-500	1000
361	2	WN-1783451913452	-500	-500
383	3	WN-1783452632677	2000	-2000
384	3	WN-1783452635560	2000	-2490
444	6	WN-1783454968205	-500	-1000
445	6	WN-1783454969616	-500	-500
446	6	WN-1783454970633	0	-500
447	6	WN-1783454972002	0	-1000
448	6	WN-1783454972987	500	-1000
449	6	WN-1783454974022	500	-500
450	6	WN-1783454974978	1000	-500
451	6	WN-1783454976045	1000	0
452	6	WN-1783454978617	500	0
453	6	WN-1783454979689	500	500
454	6	WN-1783454981815	-1000	500
455	6	WN-1783454982833	-1000	0
456	6	WN-1783454984176	-1500	0
\.


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.categories_id_seq', 6, true);


--
-- Name: cpus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.cpus_id_seq', 21, true);


--
-- Name: disks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.disks_id_seq', 22, true);


--
-- Name: documentation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.documentation_id_seq', 10, true);


--
-- Name: equipment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.equipment_id_seq', 39, true);


--
-- Name: history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.history_id_seq', 84, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.inventory_id_seq', 36, true);


--
-- Name: machines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.machines_id_seq', 21, true);


--
-- Name: map_labels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.map_labels_id_seq', 50, true);


--
-- Name: maps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.maps_id_seq', 6, true);


--
-- Name: metadata_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.metadata_id_seq', 21, true);


--
-- Name: racks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.racks_id_seq', 19, true);


--
-- Name: rentals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.rentals_id_seq', 1, false);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.rooms_id_seq', 7, true);


--
-- Name: shelves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.shelves_id_seq', 38, true);


--
-- Name: tags_documentation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.tags_documentation_id_seq', 1, false);


--
-- Name: tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.tags_id_seq', 12, true);


--
-- Name: tags_machines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.tags_machines_id_seq', 1, false);


--
-- Name: tags_racks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.tags_racks_id_seq', 22, true);


--
-- Name: tags_rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.tags_rooms_id_seq', 4, true);


--
-- Name: teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.teams_id_seq', 3, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.user_id_seq', 6, true);


--
-- Name: users_teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_teams_id_seq', 16, true);


--
-- Name: wall_segments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.wall_segments_id_seq', 354, true);


--
-- Name: walls_nodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.walls_nodes_id_seq', 456, true);


--
-- Name: machines _machine_room_uc; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT _machine_room_uc UNIQUE (name, localization_id);


--
-- Name: rooms _room_team_uc; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT _room_team_uc UNIQUE (name, team_id);


--
-- Name: access_tokens access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.access_tokens
    ADD CONSTRAINT access_tokens_pkey PRIMARY KEY (token);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: cpus cpus_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.cpus
    ADD CONSTRAINT cpus_pkey PRIMARY KEY (id);


--
-- Name: disks disks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.disks
    ADD CONSTRAINT disks_pkey PRIMARY KEY (id);


--
-- Name: documentation documentation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_pkey PRIMARY KEY (id);


--
-- Name: documentation documentation_title_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.documentation
    ADD CONSTRAINT documentation_title_key UNIQUE (title);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: history history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: map_labels map_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.map_labels
    ADD CONSTRAINT map_labels_pkey PRIMARY KEY (id);


--
-- Name: maps maps_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maps
    ADD CONSTRAINT maps_pkey PRIMARY KEY (id);


--
-- Name: maps maps_room_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maps
    ADD CONSTRAINT maps_room_id_key UNIQUE (room_id);


--
-- Name: metadata metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.metadata
    ADD CONSTRAINT metadata_pkey PRIMARY KEY (id);


--
-- Name: racks racks_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.racks
    ADD CONSTRAINT racks_name_key UNIQUE (name);


--
-- Name: racks racks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.racks
    ADD CONSTRAINT racks_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_name_key UNIQUE (name);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: shelves shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_pkey PRIMARY KEY (id);


--
-- Name: tags_documentation tags_documentation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_documentation
    ADD CONSTRAINT tags_documentation_pkey PRIMARY KEY (id);


--
-- Name: tags_machines tags_machines_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_machines
    ADD CONSTRAINT tags_machines_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tags_racks tags_racks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_racks
    ADD CONSTRAINT tags_racks_pkey PRIMARY KEY (id);


--
-- Name: tags_rooms tags_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_rooms
    ADD CONSTRAINT tags_rooms_pkey PRIMARY KEY (id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user user_login_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_login_key UNIQUE (login);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: users_teams users_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users_teams
    ADD CONSTRAINT users_teams_pkey PRIMARY KEY (id);


--
-- Name: wall_segments wall_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wall_segments
    ADD CONSTRAINT wall_segments_pkey PRIMARY KEY (id);


--
-- Name: walls_nodes walls_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.walls_nodes
    ADD CONSTRAINT walls_nodes_pkey PRIMARY KEY (id);


--
-- Name: ix_access_tokens_created_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX ix_access_tokens_created_at ON public.access_tokens USING btree (created_at);


--
-- Name: ix_user_email; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX ix_user_email ON public."user" USING btree (email);


--
-- Name: access_tokens access_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.access_tokens
    ADD CONSTRAINT access_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cpus cpus_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.cpus
    ADD CONSTRAINT cpus_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: disks disks_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.disks
    ADD CONSTRAINT disks_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: equipment equipment_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id);


--
-- Name: equipment equipment_rack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_rack_id_fkey FOREIGN KEY (rack_id) REFERENCES public.racks(id);


--
-- Name: rentals fk_rentals_inventory_id; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT fk_rentals_inventory_id FOREIGN KEY (item_id) REFERENCES public.inventory(id);


--
-- Name: history history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: inventory inventory_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: inventory inventory_localization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_localization_id_fkey FOREIGN KEY (localization_id) REFERENCES public.rooms(id);


--
-- Name: inventory inventory_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: inventory inventory_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id);


--
-- Name: inventory inventory_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: machines machines_localization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_localization_id_fkey FOREIGN KEY (localization_id) REFERENCES public.rooms(id);


--
-- Name: machines machines_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.metadata(id);


--
-- Name: machines machines_shelf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_shelf_id_fkey FOREIGN KEY (shelf_id) REFERENCES public.shelves(id);


--
-- Name: machines machines_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: map_labels map_labels_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.map_labels
    ADD CONSTRAINT map_labels_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id);


--
-- Name: maps maps_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.maps
    ADD CONSTRAINT maps_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: racks racks_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.racks
    ADD CONSTRAINT racks_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: racks racks_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.racks
    ADD CONSTRAINT racks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: rentals rentals_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: rentals rentals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: rooms rooms_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: shelves shelves_rack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_rack_id_fkey FOREIGN KEY (rack_id) REFERENCES public.racks(id);


--
-- Name: tags_documentation tags_documentation_documentation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_documentation
    ADD CONSTRAINT tags_documentation_documentation_id_fkey FOREIGN KEY (documentation_id) REFERENCES public.documentation(id);


--
-- Name: tags_documentation tags_documentation_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_documentation
    ADD CONSTRAINT tags_documentation_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: tags_machines tags_machines_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_machines
    ADD CONSTRAINT tags_machines_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id);


--
-- Name: tags_machines tags_machines_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_machines
    ADD CONSTRAINT tags_machines_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: tags_racks tags_racks_rack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_racks
    ADD CONSTRAINT tags_racks_rack_id_fkey FOREIGN KEY (rack_id) REFERENCES public.racks(id);


--
-- Name: tags_racks tags_racks_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_racks
    ADD CONSTRAINT tags_racks_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: tags_rooms tags_rooms_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_rooms
    ADD CONSTRAINT tags_rooms_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id);


--
-- Name: tags_rooms tags_rooms_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tags_rooms
    ADD CONSTRAINT tags_rooms_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id);


--
-- Name: users_teams users_teams_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users_teams
    ADD CONSTRAINT users_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: users_teams users_teams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users_teams
    ADD CONSTRAINT users_teams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: wall_segments wall_segments_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wall_segments
    ADD CONSTRAINT wall_segments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id);


--
-- Name: wall_segments wall_segments_node1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wall_segments
    ADD CONSTRAINT wall_segments_node1_id_fkey FOREIGN KEY (node1_id) REFERENCES public.walls_nodes(id);


--
-- Name: wall_segments wall_segments_node2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.wall_segments
    ADD CONSTRAINT wall_segments_node2_id_fkey FOREIGN KEY (node2_id) REFERENCES public.walls_nodes(id);


--
-- Name: walls_nodes walls_nodes_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.walls_nodes
    ADD CONSTRAINT walls_nodes_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.maps(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 8OE8yga68XbnqKpTsUyjy3EjIi3kFfQ4ZJTriwJoxOYhSiSzr4L6l8E17nQYfva

