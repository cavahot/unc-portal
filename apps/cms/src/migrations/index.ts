import * as migration_20261017_021341_arch_db_02_baseline from './20261017_021341_arch_db_02_baseline';
import * as migration_20261022_134500_dep_03_created_by from './20261022_134500_dep_03_created_by';
import * as migration_20261023_150000_perf_db_indexes from './20261023_150000_perf_db_indexes';
import * as migration_20261023_223448_pra_01_premios_acreditaciones from './20261023_223448_pra_01_premios_acreditaciones';
import * as migration_20261024_120000_mig_img_02_media_provenance from './20261024_120000_mig_img_02_media_provenance';
import * as migration_20261024_140000_mlg_01_marco_legal_campos from './20261024_140000_mlg_01_marco_legal_campos';
import * as migration_20261024_204456_lt_01_linea_tiempo from './20261024_204456_lt_01_linea_tiempo';
import * as migration_20261024_230000_cnv_01_convenios_campos from './20261024_230000_cnv_01_convenios_campos';
import * as migration_20261025_180000_arr_01_aranceles_rectorado from './20261025_180000_arr_01_aranceles_rectorado';
import * as migration_20261025_190000_glo_gn_01_glosario_guarani from './20261025_190000_glo_gn_01_glosario_guarani';
import * as migration_20261025_200000_fac_01_facultad_detalle from './20261025_200000_fac_01_facultad_detalle';
import * as migration_20261026_100000_trans_01_leyes_natural_key from './20261026_100000_trans_01_leyes_natural_key';
import * as migration_20261026_200000_trans_02_items from './20261026_200000_trans_02_items';
import * as migration_20261026_220000_dep_sec_01_users_reset_password from './20261026_220000_dep_sec_01_users_reset_password';
import * as migration_20261105_120000_glo_gn_02_approval_workflow from './20261105_120000_glo_gn_02_approval_workflow';
import * as migration_20261106_012429_titulos_01_inscripcion from './20261106_012429_titulos_01_inscripcion';
import * as migration_20261106_224807_transparencia_institucional_01 from './20261106_224807_transparencia_institucional_01';
import * as migration_20261107_172140_tramites_01_coleccion from './20261107_172140_tramites_01_coleccion';
import * as migration_20261107_182316_calendario_01_coleccion from './20261107_182316_calendario_01_coleccion';
import * as migration_20261107_191247_legales_01_globals from './20261107_191247_legales_01_globals';
import * as migration_20261107_200336_legalizaciones_01_global from './20261107_200336_legalizaciones_01_global';
import * as migration_20261108_163903_dependencias_01 from './20261108_163903_dependencias_01';
import * as migration_20261110_125232_pilares_academicos_01 from './20261110_125232_pilares_academicos_01';
import * as migration_20261112_202013_seguridad_cuentas_01 from './20261112_202013_seguridad_cuentas_01';

export const migrations = [
  {
    up: migration_20261017_021341_arch_db_02_baseline.up,
    down: migration_20261017_021341_arch_db_02_baseline.down,
    name: '20261017_021341_arch_db_02_baseline',
  },
  {
    up: migration_20261022_134500_dep_03_created_by.up,
    down: migration_20261022_134500_dep_03_created_by.down,
    name: '20261022_134500_dep_03_created_by',
  },
  {
    up: migration_20261023_150000_perf_db_indexes.up,
    down: migration_20261023_150000_perf_db_indexes.down,
    name: '20261023_150000_perf_db_indexes',
  },
  {
    up: migration_20261023_223448_pra_01_premios_acreditaciones.up,
    down: migration_20261023_223448_pra_01_premios_acreditaciones.down,
    name: '20261023_223448_pra_01_premios_acreditaciones',
  },
  {
    up: migration_20261024_120000_mig_img_02_media_provenance.up,
    down: migration_20261024_120000_mig_img_02_media_provenance.down,
    name: '20261024_120000_mig_img_02_media_provenance',
  },
  {
    up: migration_20261024_140000_mlg_01_marco_legal_campos.up,
    down: migration_20261024_140000_mlg_01_marco_legal_campos.down,
    name: '20261024_140000_mlg_01_marco_legal_campos',
  },
  {
    up: migration_20261024_204456_lt_01_linea_tiempo.up,
    down: migration_20261024_204456_lt_01_linea_tiempo.down,
    name: '20261024_204456_lt_01_linea_tiempo',
  },
  {
    up: migration_20261024_230000_cnv_01_convenios_campos.up,
    down: migration_20261024_230000_cnv_01_convenios_campos.down,
    name: '20261024_230000_cnv_01_convenios_campos',
  },
  {
    up: migration_20261025_180000_arr_01_aranceles_rectorado.up,
    down: migration_20261025_180000_arr_01_aranceles_rectorado.down,
    name: '20261025_180000_arr_01_aranceles_rectorado',
  },
  {
    up: migration_20261025_190000_glo_gn_01_glosario_guarani.up,
    down: migration_20261025_190000_glo_gn_01_glosario_guarani.down,
    name: '20261025_190000_glo_gn_01_glosario_guarani',
  },
  {
    up: migration_20261025_200000_fac_01_facultad_detalle.up,
    down: migration_20261025_200000_fac_01_facultad_detalle.down,
    name: '20261025_200000_fac_01_facultad_detalle',
  },
  {
    up: migration_20261026_100000_trans_01_leyes_natural_key.up,
    down: migration_20261026_100000_trans_01_leyes_natural_key.down,
    name: '20261026_100000_trans_01_leyes_natural_key',
  },
  {
    up: migration_20261026_200000_trans_02_items.up,
    down: migration_20261026_200000_trans_02_items.down,
    name: '20261026_200000_trans_02_items',
  },
  {
    up: migration_20261026_220000_dep_sec_01_users_reset_password.up,
    down: migration_20261026_220000_dep_sec_01_users_reset_password.down,
    name: '20261026_220000_dep_sec_01_users_reset_password',
  },
  {
    up: migration_20261105_120000_glo_gn_02_approval_workflow.up,
    down: migration_20261105_120000_glo_gn_02_approval_workflow.down,
    name: '20261105_120000_glo_gn_02_approval_workflow',
  },
  {
    up: migration_20261106_012429_titulos_01_inscripcion.up,
    down: migration_20261106_012429_titulos_01_inscripcion.down,
    name: '20261106_012429_titulos_01_inscripcion',
  },
  {
    up: migration_20261106_224807_transparencia_institucional_01.up,
    down: migration_20261106_224807_transparencia_institucional_01.down,
    name: '20261106_224807_transparencia_institucional_01',
  },
  {
    up: migration_20261107_172140_tramites_01_coleccion.up,
    down: migration_20261107_172140_tramites_01_coleccion.down,
    name: '20261107_172140_tramites_01_coleccion',
  },
  {
    up: migration_20261107_182316_calendario_01_coleccion.up,
    down: migration_20261107_182316_calendario_01_coleccion.down,
    name: '20261107_182316_calendario_01_coleccion',
  },
  {
    up: migration_20261107_191247_legales_01_globals.up,
    down: migration_20261107_191247_legales_01_globals.down,
    name: '20261107_191247_legales_01_globals',
  },
  {
    up: migration_20261107_200336_legalizaciones_01_global.up,
    down: migration_20261107_200336_legalizaciones_01_global.down,
    name: '20261107_200336_legalizaciones_01_global',
  },
  {
    up: migration_20261108_163903_dependencias_01.up,
    down: migration_20261108_163903_dependencias_01.down,
    name: '20261108_163903_dependencias_01',
  },
  {
    up: migration_20261110_125232_pilares_academicos_01.up,
    down: migration_20261110_125232_pilares_academicos_01.down,
    name: '20261110_125232_pilares_academicos_01',
  },
  {
    up: migration_20261112_202013_seguridad_cuentas_01.up,
    down: migration_20261112_202013_seguridad_cuentas_01.down,
    name: '20261112_202013_seguridad_cuentas_01'
  },
];
