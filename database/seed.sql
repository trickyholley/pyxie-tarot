--
-- PostgreSQL database dump
--

\restrict SloszCzAHLaDK3mRExvLHc4d61PSD1XLeLfws4DOPJGayE4DH41d9J5ZGLUF5Q2

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
-- Data for Name: spreads; Type: TABLE DATA; Schema: public; Owner: pyxie
--

COPY public.spreads (id, name, description, num_cards, positions, prompts, created_at, updated_at, user_id) FROM stdin;
1	Past / Present / Future	A simple three-card linear spread.	3	["0", "1", "2"]	["Past influences", "Current situation", "What's ahead"]	2026-06-30 20:30:35.537796-04	2026-06-30 20:30:35.537796-04	\N
\.


--
-- Name: spreads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pyxie
--

SELECT pg_catalog.setval('public.spreads_id_seq', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict SloszCzAHLaDK3mRExvLHc4d61PSD1XLeLfws4DOPJGayE4DH41d9J5ZGLUF5Q2

