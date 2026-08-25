.text
main:
    li t0, -16777216       # framebuffer base
    li t3, -16711680       # keyboard register address

    la s2, segX
    la s3, segY
    li s4, 4                 # initial length
    li s6, 24                # capacity
    li s1, 1                  # start moving right

    li s7, 20                # initial food x
    li s8, 5                  # initial food y
    li s9, 12345              # xorshift32 seed

    li s10, 0                 # game state: 0 = playing, 1 = dead/blinking
    li s11, 0                  # blink phase counter (0..9, 10 phases = 5 blinks)

    li s5, 0
init_draw:
    slli t6, s5, 2
    add t2, s2, t6
    lw a4, 0(t2)
    add t2, s3, t6
    lw a5, 0(t2)
    slli t2, a5, 5
    add t2, t2, a4
    slli t2, t2, 2
    add t2, t2, t0
    li t1, 65280            # green
    sw t1, 0(t2)
    addi s5, s5, 1
    blt s5, s4, init_draw

    slli t2, s8, 5
    add t2, t2, s7
    slli t2, t2, 2
    add t2, t2, t0
    li t1, 16711680          # red (food)
    sw t1, 0(t2)

tick:
    bnez s10, game_over_blink

    lw t4, 0(t3)
    beqz t4, move_step

    li t5, 38
    beq t4, t5, set_up
    li t5, 40
    beq t4, t5, set_down
    li t5, 37
    beq t4, t5, set_left
    li t5, 39
    beq t4, t5, set_right
    j consume_key

set_up:
    li s1, 0
    j consume_key
set_down:
    li s1, 2
    j consume_key
set_left:
    li s1, 3
    j consume_key
set_right:
    li s1, 1

consume_key:
    sw x0, 0(t3)

move_step:
    lw a4, 0(s2)
    lw a5, 0(s3)

    li t5, 0
    beq s1, t5, move_up
    li t5, 1
    beq s1, t5, move_right
    li t5, 2
    beq s1, t5, move_down
    j move_left

move_up:
    addi a0, a5, -1
    bgez a0, up_ok
    li a0, 17
up_ok:
    mv a1, a0
    mv a0, a4
    j head_computed

move_down:
    addi a1, a5, 1
    li t5, 18
    blt a1, t5, down_ok
    li a1, 0
down_ok:
    mv a0, a4
    j head_computed

move_left:
    addi a0, a4, -1
    bgez a0, left_ok
    li a0, 31
left_ok:
    mv a1, a5
    j head_computed

move_right:
    addi a0, a4, 1
    li t5, 32
    blt a0, t5, right_ok
    li a0, 0
right_ok:
    mv a1, a5

head_computed:
    li a6, 0
    bne a0, s7, food_check_done
    bne a1, s8, food_check_done
    li a6, 1
food_check_done:

    li a7, 0
    beqz a6, skip_grow
    bge s4, s6, skip_grow
    addi s4, s4, 1
    li a7, 1
skip_grow:

    # scan limit: full length if we grew this tick (tail didn't vacate),
    # length-1 otherwise (the true tail is about to vacate, so landing
    # there isn't a collision)
    mv t6, s4
    bnez a7, scan_limit_ready
    addi t6, s4, -1
scan_limit_ready:

    li s5, 0
collision_loop:
    bge s5, t6, no_collision
    slli t5, s5, 2
    add t2, s2, t5
    lw a2, 0(t2)
    add t2, s3, t5
    lw a3, 0(t2)
    bne a0, a2, collision_next
    bne a1, a3, collision_next
    j collision_detected
collision_next:
    addi s5, s5, 1
    j collision_loop

collision_detected:
    li s10, 1
    li s11, 0
    j tick

no_collision:
    bnez a7, do_shift
    addi t6, s4, -1
    slli t6, t6, 2
    add t2, s2, t6
    lw a2, 0(t2)
    add t2, s3, t6
    lw a3, 0(t2)

do_shift:
    addi s5, s4, -1
shift_loop:
    beqz s5, shift_done
    slli t6, s5, 2
    addi t5, t6, -4
    add t2, s2, t5
    lw a4, 0(t2)
    add t2, s3, t5
    lw a5, 0(t2)
    add t2, s2, t6
    sw a4, 0(t2)
    add t2, s3, t6
    sw a5, 0(t2)
    addi s5, s5, -1
    j shift_loop
shift_done:
    sw a0, 0(s2)
    sw a1, 0(s3)

    bnez a7, draw_new_head
    slli t2, a3, 5
    add t2, t2, a2
    slli t2, t2, 2
    add t2, t2, t0
    li t1, 0
    sw t1, 0(t2)

draw_new_head:
    slli t2, a1, 5
    add t2, t2, a0
    slli t2, t2, 2
    add t2, t2, t0
    li t1, 65280
    sw t1, 0(t2)

    beqz a6, tick
    j spawn_food

spawn_food:
    slli t5, s9, 13
    xor s9, s9, t5
    srli t5, s9, 17
    xor s9, s9, t5
    slli t5, s9, 5
    xor s9, s9, t5

    andi s7, s9, 31
    srli t6, s9, 5
    andi t6, t6, 31
    li t5, 18
    blt t6, t5, food_y_ok
    addi t6, t6, -18
food_y_ok:
    mv s8, t6

    slli t2, s8, 5
    add t2, t2, s7
    slli t2, t2, 2
    add t2, t2, t0
    li t1, 16711680
    sw t1, 0(t2)

    j tick

game_over_blink:
    li t5, 10                 # 10 phases = 5 blinks (off, on) x5
    bge s11, t5, game_over_idle

    andi t6, s11, 1            # even phase = off (black), odd = on (green)
    beqz t6, blink_black
    li t1, 65280                # green
    j blink_fill
blink_black:
    li t1, 0                     # black

blink_fill:
    li s5, 0
blink_loop:
    bge s5, s4, blink_done
    slli t6, s5, 2
    add t2, s2, t6
    lw a4, 0(t2)
    add t2, s3, t6
    lw a5, 0(t2)
    slli t2, a5, 5
    add t2, t2, a4
    slli t2, t2, 2
    add t2, t2, t0
    sw t1, 0(t2)
    addi s5, s5, 1
    j blink_loop
blink_done:

    addi s11, s11, 1
    j tick

game_over_idle:
    lw t4, 0(t3)
    beqz t4, tick
    sw x0, 0(t3)
    j tick

.data
segX: .word 10, 9, 8, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
segY: .word 9, 9, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0