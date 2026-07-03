--
-- PostgreSQL database dump
--

\restrict sC26titS6vvQyu2b9PqtIGtXFWDGlpXviTj4JyJ2dw009rYn4eHigiINozgHxLD

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
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
395f25063d98
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, hashed_password, created_at, updated_at) FROM stdin;
6c272b91-124f-444b-9266-7039cbb40849	alice	alice@example.com	$argon2id$v=19$m=65536,t=3,p=4$XGSErQ0XceM5JLEJ/CmsEA$HbDYQHUqDucet0/M8Gwcr3HTjGYj5MMpULI5E8SJ7j4	2026-07-01 21:41:18.533318-04	2026-07-01 21:41:18.533318-04
747d7565-c823-4a1d-86be-5f8c8a189d4a	tricky	tricky@example.com	$argon2id$v=19$m=65536,t=3,p=4$BKOwpCXxgf0Aqhxlzh0eFA$IFt22me01iXEMRc1BGG2OrM/5Y6DX1BVWaiFpEMSteo	2026-07-02 20:56:03.237044-04	2026-07-02 20:56:03.237044-04
f0737f3f-c1c8-4f2c-9ea6-126ddadcce34	trickyholley	tricky@holley.dev	$argon2id$v=19$m=65536,t=3,p=4$CsS2AZCsSEyuWn7oVfDsrA$tauZGPBJdgbi/6LscxiGOZGLRCByEPQ4CKzjmfzyIoI	2026-07-02 20:58:40.290383-04	2026-07-02 20:58:40.290383-04
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- PostgreSQL database dump complete
--

\unrestrict sC26titS6vvQyu2b9PqtIGtXFWDGlpXviTj4JyJ2dw009rYn4eHigiINozgHxLD

