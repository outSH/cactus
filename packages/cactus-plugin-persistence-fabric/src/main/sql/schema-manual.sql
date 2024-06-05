CREATE SCHEMA fabric;

ALTER SCHEMA fabric OWNER TO postgres;

--
-- Name: block; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.block (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number numeric NOT NULL,
    hash text NOT NULL,
    transaction_count numeric DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE fabric.block OWNER TO postgres;

CREATE UNIQUE INDEX block_hash_unique_idx ON fabric.block(hash);
CREATE UNIQUE INDEX block_number_unique_idx ON fabric.block(number);

--
-- Name: certificate; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.certificate (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    serial_number text NOT NULL,
    subject_common_name text DEFAULT ''::text,
    subject_org_unit text DEFAULT ''::text,
    subject_org text DEFAULT ''::text,
    subject_locality text DEFAULT ''::text,
    subject_state text DEFAULT ''::text,
    subject_country text DEFAULT ''::text,
    issuer_common_name text DEFAULT ''::text,
    issuer_org_unit text DEFAULT ''::text,
    issuer_org text DEFAULT ''::text,
    issuer_locality text DEFAULT ''::text,
    issuer_state text DEFAULT ''::text,
    issuer_country text DEFAULT ''::text,
    subject_alt_name text NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone NOT NULL,
    pem text NOT NULL
);


ALTER TABLE fabric.certificate OWNER TO postgres;

CREATE UNIQUE INDEX certifiate_serial_number_unique_idx ON fabric.certifiate(serial_number);

--
-- Name: transaction; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.transaction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hash text NOT NULL,
    channel_id text NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    protocol_version smallint DEFAULT '0'::smallint NOT NULL,
    type text NOT NULL,
    epoch bigint NOT NULL,
    block_id uuid,
    block_number numeric
);


ALTER TABLE fabric.transaction OWNER TO postgres;

CREATE UNIQUE INDEX transaction_hash_unique_idx ON fabric.transaction(hash);

--
-- Name: transaction_action; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.transaction_action (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text DEFAULT ''::text,
    function_args text DEFAULT ''::text,
    chaincode_id text NOT NULL,
    creator_msp_id text NOT NULL,
    creator_certificate_id uuid,
    transaction_id uuid
);


ALTER TABLE fabric.transaction_action OWNER TO postgres;

--
-- Name: transaction_action_endorsement; Type: TABLE; Schema: fabric; Owner: postgres
--

CREATE TABLE fabric.transaction_action_endorsement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mspid text NOT NULL,
    signature text NOT NULL,
    certificate_id uuid NOT NULL,
    transaction_action_id uuid
);


ALTER TABLE fabric.transaction_action_endorsement OWNER TO postgres;


-- FUNCTION: fabric.get_missing_blocks_in_range(integer, integer)

-- DROP FUNCTION IF EXISTS fabric.get_missing_blocks_in_range(integer, integer);

CREATE OR REPLACE FUNCTION fabric.get_missing_blocks_in_range(
  start_number integer,
  end_number integer)
RETURNS TABLE(block_number integer)
LANGUAGE 'plpgsql'
COST 100
VOLATILE PARALLEL UNSAFE
ROWS 1000
AS $BODY$
BEGIN
  RETURN query
    SELECT series AS block_number
    FROM generate_series(start_number, end_number, 1) series
    LEFT JOIN fabric.block ON series = block.number
    WHERE block.number IS NULL;
END;
$BODY$;

ALTER FUNCTION fabric.get_missing_blocks_in_range(integer, integer)
    OWNER TO postgres;

