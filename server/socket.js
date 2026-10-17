let ioInstance = null;

function initSocket(io) {
  ioInstance = io;
  return io;
}

function getIO() {
  return ioInstance;
}

function emitWalletUpdate(userId, bakiye) {
  if (!ioInstance) return;
  ioInstance.emit('wallet:update', {
    userId: Number(userId),
    bakiye: Number(bakiye),
  });
}

function emitMealsChanged(payload = {}) {
  if (!ioInstance) return;
  ioInstance.emit('meals:changed', payload);
}

function emitOrderCreated(payload) {
  if (!ioInstance) return;
  ioInstance.emit('order:created', payload);
}

function emitOrderDelivered(payload) {
  if (!ioInstance) return;
  const { aliciId, asciId } = payload;
  const event = {
    ...payload,
    message: 'Sipariş başarıyla teslim edildi!',
  };
  ioInstance.emit('order:delivered', event);
  if (aliciId) ioInstance.to(`user:${aliciId}`).emit('order:delivered', event);
  if (asciId) ioInstance.to(`user:${asciId}`).emit('order:delivered', event);
}

function emitOrderChanged(payload) {
  if (!ioInstance) return;
  const { aliciId, asciId } = payload;
  ioInstance.emit('order:changed', payload);
  if (aliciId) ioInstance.to(`user:${aliciId}`).emit('order:changed', payload);
  if (asciId) ioInstance.to(`user:${asciId}`).emit('order:changed', payload);
}

function emitRatingUpdate(payload) {
  if (!ioInstance) return;
  ioInstance.emit('rating:update', payload);
  if (payload?.userId) {
    ioInstance.to(`user:${payload.userId}`).emit('rating:update', payload);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitWalletUpdate,
  emitMealsChanged,
  emitOrderCreated,
  emitOrderDelivered,
  emitOrderChanged,
  emitRatingUpdate,
};
