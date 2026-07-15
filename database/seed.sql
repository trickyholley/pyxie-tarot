--
-- PostgreSQL database dump
--

\restrict 8iX6MYgjdCa7q6lh8hsoENuiSTBgbYLMd0xykUUHuNYsXABLw2XS86WMiwoAbdc

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

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.alembic_version (version_num) VALUES ('395f25063d98');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, username, email, password, created_at, updated_at, role) VALUES ('5474763d-88d5-47df-9c79-b5d1b1169e0c', 'admin', 'admin@pyxie-tarot.live', '$argon2id$v=19$m=65536,t=3,p=4$OJ+mgbX5QgPOA35HA1HgPQ$pY/5hu13+HDefhHDC47AjeAYWPU+RsNhAehL9pfv1oE', '2026-07-04 16:02:16.648368-04', '2026-07-04 16:02:16.648368-04', 'admin');


--
-- Data for Name: spreads; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

\unrestrict 8iX6MYgjdCa7q6lh8hsoENuiSTBgbYLMd0xykUUHuNYsXABLw2XS86WMiwoAbdc
