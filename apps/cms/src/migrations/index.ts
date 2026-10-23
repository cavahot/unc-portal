import * as migration_20261017_021341_arch_db_02_baseline from './20261017_021341_arch_db_02_baseline';
import * as migration_20261022_134500_dep_03_created_by from './20261022_134500_dep_03_created_by';

export const migrations = [
  {
    up: migration_20261017_021341_arch_db_02_baseline.up,
    down: migration_20261017_021341_arch_db_02_baseline.down,
    name: '20261017_021341_arch_db_02_baseline'
  },
  {
    up: migration_20261022_134500_dep_03_created_by.up,
    down: migration_20261022_134500_dep_03_created_by.down,
    name: '20261022_134500_dep_03_created_by'
  },
];
