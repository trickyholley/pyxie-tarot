--
-- PostgreSQL database dump
--

\restrict Sod6gTbl52iyBlQDk187maeYq8Rjc1206q4rBdqrQgy0Z9mLPhhqZzl7G6hXqQl

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

INSERT INTO public.users (id, username, email, password, created_at, updated_at, role) VALUES ('d37a7816-34c1-4f92-8b01-1d7ca1253441', 'tricky', 'tricky@holley.dev', '$argon2id$v=19$m=65536,t=3,p=4$qr4dZ//QIuz5D7gzTh5JsQ$eG6VmK4ugef0gvhydhz5gI2H0ZnEWm2i68277OWoBU', '2026-07-03 19:06:11.591638-04', '2026-07-03 19:06:11.591638-04', 'admin');


--
-- Data for Name: spreads; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

\unrestrict Sod6gTbl52iyBlQDk187maeYq8Rjc1206q4rBdqrQgy0Z9mLPhhqZzl7G6hXqQl

