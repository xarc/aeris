# Snake Game - RISC-V RV32I
# Bitmap Display: 64x64, framebuffer 0xFF000000
# Keyboard MMIO: 0xFF010000  (ative o Game Mode no display)
# Controles: W=cima  S=baixo  A=esquerda  D=direita

.data
sx:   .word 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
sy:   .word 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
slen: .word 3
dir:  .word 0
fx:   .word 48
fy:   .word 20
seed: .word 44101

.text

    # Init cobra: (30,32) (29,32) (28,32) indo para direita
    la   t0, sx
    li   t1, 30
    sw   t1, 0(t0)
    li   t1, 29
    sw   t1, 4(t0)
    li   t1, 28
    sw   t1, 8(t0)
    la   t0, sy
    li   t1, 32
    sw   t1, 0(t0)
    sw   t1, 4(t0)
    sw   t1, 8(t0)

    jal  ra, clear_screen
    jal  ra, draw_snake
    jal  ra, draw_food

game_loop:
    jal  ra, read_key
    jal  ra, step

    li   t0, 1000
delay_loop:
    addi t0, t0, -1
    bnez t0, delay_loop

    j    game_loop


# -----------------------------------------------------------
# clear_screen: preenche 64x64 com preto
# -----------------------------------------------------------
clear_screen:
    lui  t0, 0xFF000
    li   t1, 4096
cs_loop:
    sw   zero, 0(t0)
    addi t0, t0, 4
    addi t1, t1, -1
    bnez t1, cs_loop
    jr   ra


# -----------------------------------------------------------
# pix(a0=x, a1=y, a2=color): desenha um pixel
# -----------------------------------------------------------
pix:
    slli t0, a1, 6
    add  t0, t0, a0
    slli t0, t0, 2
    lui  t1, 0xFF000
    add  t1, t1, t0
    sw   a2, 0(t1)
    jr   ra


# -----------------------------------------------------------
# draw_snake: desenha toda a cobra em verde (apenas no init)
# -----------------------------------------------------------
draw_snake:
    addi sp, sp, -20
    sw   ra,  0(sp)
    sw   s0,  4(sp)
    sw   s1,  8(sp)
    sw   s2, 12(sp)
    sw   s3, 16(sp)

    la   s0, sx
    la   s1, sy
    la   s2, slen
    lw   s2, 0(s2)
    li   a2, 0xFF00
    li   s3, 0

ds_loop:
    beq  s3, s2, ds_done
    slli t0, s3, 2
    add  t1, s0, t0
    lw   a0, 0(t1)
    add  t1, s1, t0
    lw   a1, 0(t1)
    jal  ra, pix
    li   a2, 0xFF00
    addi s3, s3, 1
    j    ds_loop

ds_done:
    lw   ra,  0(sp)
    lw   s0,  4(sp)
    lw   s1,  8(sp)
    lw   s2, 12(sp)
    lw   s3, 16(sp)
    addi sp, sp, 20
    jr   ra


# -----------------------------------------------------------
# draw_food: desenha comida em vermelho
# -----------------------------------------------------------
draw_food:
    addi sp, sp, -4
    sw   ra, 0(sp)
    la   t0, fx
    lw   a0, 0(t0)
    la   t0, fy
    lw   a1, 0(t0)
    lui  a2, 0xFF0
    jal  ra, pix
    lw   ra, 0(sp)
    addi sp, sp, 4
    jr   ra


# -----------------------------------------------------------
# read_key: le MMIO do teclado e atualiza direcao
# Impede virada de 180 graus
# -----------------------------------------------------------
read_key:
    lui  t0, 0xFF010
    lw   t1, 0(t0)
    beqz t1, rk_done
    sw   zero, 0(t0)

    la   t0, dir
    lw   t2, 0(t0)

    li   t3, 87
    bne  t1, t3, rk_s
    li   t3, 1
    beq  t2, t3, rk_done
    li   t3, 3
    sw   t3, 0(t0)
    j    rk_done

rk_s:
    li   t3, 83
    bne  t1, t3, rk_a
    li   t3, 3
    beq  t2, t3, rk_done
    li   t3, 1
    sw   t3, 0(t0)
    j    rk_done

rk_a:
    li   t3, 65
    bne  t1, t3, rk_d
    li   t3, 0
    beq  t2, t3, rk_done
    li   t3, 2
    sw   t3, 0(t0)
    j    rk_done

rk_d:
    li   t3, 68
    bne  t1, t3, rk_done
    li   t3, 2
    beq  t2, t3, rk_done
    li   t3, 0
    sw   t3, 0(t0)

rk_done:
    jr   ra


# -----------------------------------------------------------
# new_food: xorshift32 RNG -> apaga velha, coloca nova comida
# -----------------------------------------------------------
new_food:
    addi sp, sp, -4
    sw   ra, 0(sp)

    la   t0, fx
    lw   a0, 0(t0)
    la   t0, fy
    lw   a1, 0(t0)
    li   a2, 0
    jal  ra, pix

    la   t0, seed
    lw   t1, 0(t0)
    slli t2, t1, 13
    xor  t1, t1, t2
    srli t2, t1, 17
    xor  t1, t1, t2
    slli t2, t1, 5
    xor  t1, t1, t2
    sw   t1, 0(t0)

    andi t2, t1, 63
    la   t0, fx
    sw   t2, 0(t0)

    srli t3, t1, 6
    andi t3, t3, 63
    la   t0, fy
    sw   t3, 0(t0)

    mv   a0, t2
    mv   a1, t3
    lui  a2, 0xFF0
    jal  ra, pix

    lw   ra, 0(sp)
    addi sp, sp, 4
    jr   ra


# -----------------------------------------------------------
# step: avanca a cobra um frame
# -----------------------------------------------------------
step:
    addi sp, sp, -28
    sw   ra,  0(sp)
    sw   s0,  4(sp)
    sw   s1,  8(sp)
    sw   s2, 12(sp)
    sw   s3, 16(sp)
    sw   s4, 20(sp)
    sw   s5, 24(sp)

    la   s2, sx
    la   s3, sy
    lw   s0, 0(s2)
    lw   s1, 0(s3)

    la   t0, dir
    lw   t0, 0(t0)
    li   t1, 0
    beq  t0, t1, st_right
    li   t1, 1
    beq  t0, t1, st_down
    li   t1, 2
    beq  t0, t1, st_left
    addi s1, s1, -1
    j    st_wrap
st_right:
    addi s0, s0, 1
    j    st_wrap
st_down:
    addi s1, s1, 1
    j    st_wrap
st_left:
    addi s0, s0, -1

st_wrap:
    bge  s0, zero, st_wx_hi
    li   s0, 63
    j    st_wy
st_wx_hi:
    li   t0, 64
    blt  s0, t0, st_wy
    li   s0, 0

st_wy:
    bge  s1, zero, st_wy_hi
    li   s1, 63
    j    st_food
st_wy_hi:
    li   t0, 64
    blt  s1, t0, st_food
    li   s1, 0

st_food:
    la   t0, fx
    lw   t1, 0(t0)
    la   t0, fy
    lw   t2, 0(t0)
    bne  s0, t1, st_no_food
    bne  s1, t2, st_no_food
    la   t0, slen
    lw   t1, 0(t0)
    addi t1, t1, 1
    sw   t1, 0(t0)
    jal  ra, new_food
    j    st_shift

st_no_food:
    la   t0, slen
    lw   s4, 0(t0)
    addi t0, s4, -1
    slli t0, t0, 2
    add  t1, s2, t0
    lw   a0, 0(t1)
    add  t1, s3, t0
    lw   a1, 0(t1)
    li   a2, 0
    jal  ra, pix

st_shift:
    la   t0, slen
    lw   s4, 0(t0)
    addi s5, s4, -1

st_shift_loop:
    li   t0, 1
    blt  s5, t0, st_shift_done
    slli t0, s5, 2
    add  t1, s2, t0
    addi t2, t1, -4
    lw   t3, 0(t2)
    sw   t3, 0(t1)
    add  t1, s3, t0
    addi t2, t1, -4
    lw   t3, 0(t2)
    sw   t3, 0(t1)
    addi s5, s5, -1
    j    st_shift_loop

st_shift_done:
    sw   s0, 0(s2)
    sw   s1, 0(s3)

    mv   a0, s0
    mv   a1, s1
    li   a2, 0xFF00
    jal  ra, pix

    lw   ra,  0(sp)
    lw   s0,  4(sp)
    lw   s1,  8(sp)
    lw   s2, 12(sp)
    lw   s3, 16(sp)
    lw   s4, 20(sp)
    lw   s5, 24(sp)
    addi sp, sp, 28
    jr   ra
