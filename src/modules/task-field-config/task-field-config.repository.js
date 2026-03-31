import prisma from '../../config/database.js';

class TaskFieldConfigRepository {
  async findAll() {
    return prisma.taskFieldConfig.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        fieldName: true,
        label: true,
        inputType: true,
        groupName: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  async findActive() {
    return prisma.taskFieldConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        fieldName: true,
        label: true,
        inputType: true,
        groupName: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  async batchUpdate(configs) {
    const updates = configs.map((cfg) =>
      prisma.taskFieldConfig.update({
        where: { id: cfg.id },
        data: {
          isActive: cfg.isActive,
          sortOrder: cfg.sortOrder,
          label: cfg.label,
          inputType: cfg.inputType,
          groupName: cfg.groupName,
        },
      })
    );
    return prisma.$transaction(updates);
  }
}

export default new TaskFieldConfigRepository();
