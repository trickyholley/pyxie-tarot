--
-- PostgreSQL database dump
--

\restrict F31KanNkf5gyy4t8cDMUtBdSzXUFxz77eKVPzLA6UOKb3NzmAXjr6MGVfhWNXOq

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

INSERT INTO public.users (id, username, email, password, created_at, updated_at, role) VALUES ('756e9d9b-74b0-4ff1-87ce-64c2ae99c8b9', 'tricky', 'tricky@holley.dev', '$argon2id$v=19$m=65536,t=3,p=4$MqlpPHrOaCnZ4k0vO2A2YA$nkWwSqLuTMrr50QfndGlRtFC4GzwekDmc71OCB4Ghzs', '2026-07-04 10:24:37.078964-04', '2026-07-04 10:24:37.078964-04', 'user');


--
-- Data for Name: spreads; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

\unrestrict F31KanNkf5gyy4t8cDMUtBdSzXUFxz77eKVPzLA6UOKb3NzmAXjr6MGVfhWNXOq

