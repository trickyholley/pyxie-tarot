--
-- PostgreSQL database dump
--

\restrict FKOXhVrSBhrIS7rQNa9JmWmIgkEm0lMQwvFvgE8CEEbfPrHMHRpBwgAy9rGBD8D

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: spreads; Type: TABLE; Schema: public; Owner: pyxie
--

CREATE TABLE public.spreads (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    num_cards integer NOT NULL,
    positions jsonb NOT NULL,
    prompts jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    CONSTRAINT spreads_num_cards_check CHECK (((num_cards >= 1) AND (num_cards <= 9)))
);


ALTER TABLE public.spreads OWNER TO pyxie;

--
-- Name: spreads_id_seq; Type: SEQUENCE; Schema: public; Owner: pyxie
--

CREATE SEQUENCE public.spreads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spreads_id_seq OWNER TO pyxie;

--
-- Name: spreads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pyxie
--

ALTER SEQUENCE public.spreads_id_seq OWNED BY public.spreads.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: pyxie
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO pyxie;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: pyxie
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO pyxie;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pyxie
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: spreads id; Type: DEFAULT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.spreads ALTER COLUMN id SET DEFAULT nextval('public.spreads_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: spreads spreads_pkey; Type: CONSTRAINT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.spreads
    ADD CONSTRAINT spreads_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: spreads spreads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pyxie
--

ALTER TABLE ONLY public.spreads
    ADD CONSTRAINT spreads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FKOXhVrSBhrIS7rQNa9JmWmIgkEm0lMQwvFvgE8CEEbfPrHMHRpBwgAy9rGBD8D

